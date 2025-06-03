import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@4.3.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Initialize Resend client
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Helper function for logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[THIRD-TEMPLATE] ${step}${detailsStr}`);
};

// Main function for newsletter generation - runs in the background
async function generateNewsletter(userId: string, selectedCount: number, jwt: string) {
  try {
    // 2) Set up Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 3) Load profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle")
      .eq("id", userId)
      .single();
      
    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // 4) Subscription & plan & tokens checks
    if (!profile.subscription_tier) {
      throw new Error("You must have an active subscription to generate newsletters");
    }
    if (!profile.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      throw new Error("You have no remaining newsletter generations");
    }
    if (!profile.twitter_bookmark_access_token) {
      throw new Error("Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings.");
    }
    const now = Math.floor(Date.now() / 1000);
    if (profile.twitter_bookmark_token_expires_at && profile.twitter_bookmark_token_expires_at < now) {
      throw new Error("Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks.");
    }

    // 5) Ensure numerical_id
    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY in environment");
        const cleanHandle = profile.twitter_handle.trim().replace("@", "");
        const resp = await fetch(`https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(cleanHandle)}`, {
          method: "GET",
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "twitter293.p.rapidapi.com"
          }
        });
        if (!resp.ok) throw new Error(`RapidAPI returned ${resp.status}`);
        const j = await resp.json();
        if (j?.user?.result?.rest_id) {
          numericalId = j.user.result.rest_id;
          const { error: updateError } = await supabase.from("profiles").update({
            numerical_id: numericalId
          }).eq("id", userId);
          if (updateError) console.error("Error updating numerical_id:", updateError);
        } else {
          throw new Error("Could not retrieve your Twitter ID. Please try again later.");
        }
      } catch (err) {
        console.error("Error fetching numerical_id:", err);
        throw new Error("Could not retrieve your Twitter ID. Please try again later.");
      }
    }
    if (!numericalId) {
      throw new Error("Could not determine your Twitter ID. Please update your Twitter handle in settings.");
    }

    // 6) Fetch bookmarks
    logStep("Fetching bookmarks", { count: selectedCount, userId: numericalId });
    const bookmarksResp = await fetch(`https://api.twitter.com/2/users/${numericalId}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${profile.twitter_bookmark_access_token}`,
        "Content-Type": "application/json"
      }
    });
    if (!bookmarksResp.ok) {
      const text = await bookmarksResp.text();
      console.error(`Twitter API error (${bookmarksResp.status}):`, text);
      if (bookmarksResp.status === 401) throw new Error("Your Twitter access token is invalid. Please reconnect your Twitter bookmarks.");
      if (bookmarksResp.status === 429) throw new Error("Twitter API rate limit exceeded. Please try again later.");
      throw new Error(`Twitter API error: ${bookmarksResp.status}`);
    }
    const bookmarksData = await bookmarksResp.json();
    if (!bookmarksData?.data) {
      console.error("Invalid or empty bookmark data:", bookmarksData);
      if (bookmarksData.meta?.result_count === 0) throw new Error("You don't have any bookmarks. Please save some tweets before generating a newsletter.");
      throw new Error("Failed to retrieve bookmarks from Twitter");
    }
    const tweetIds = bookmarksData.data.map((t: any) => t.id);
    logStep("Successfully fetched bookmarks", { count: tweetIds.length });

    // 7) Fetch detailed tweets via Apify
    logStep("Fetching detailed tweet data via Apify");
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) throw new Error("Missing APIFY_API_KEY environment variable");
    const apifyResp = await fetch(`https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "filter:blue_verified": false, "filter:consumer_video": false, "filter:has_engagement": false,
        "filter:hashtags": false, "filter:images": false, "filter:links": false, "filter:media": false,
        "filter:mentions": false, "filter:native_video": false, "filter:nativeretweets": false,
        "filter:news": false, "filter:pro_video": false, "filter:quote": false, "filter:replies": false,
        "filter:safe": false, "filter:spaces": false, "filter:twimg": false, "filter:videos": false,
        "filter:vine": false, lang: "en", maxItems: selectedCount, tweetIDs: tweetIds
      })
    });
    if (!apifyResp.ok) {
      const text = await apifyResp.text();
      console.error(`Apify API error (${apifyResp.status}):`, text);
      throw new Error(`Apify API error: ${apifyResp.status}`);
    }
    const apifyData = await apifyResp.json();
    logStep("Successfully fetched detailed tweet data", { tweetCount: apifyData.length || 0 });

    // 8) Format tweets for OpenAI
    function parseToOpenAI(data: any) {
      const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      let out = "";
      arr.forEach((t, i) => {
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try { dateStr = new Date(t.createdAt).toISOString().split("T")[0]; } catch {}
        const photo = t.extendedEntities?.media?.find((m: any) => m.type === "photo")?.media_url_https;
        out += `Tweet ${i + 1}\nID: ${t.id}\nText: ${txt}\nReplies: ${t.replyCount || 0}\nLikes: ${t.likeCount || 0}\nImpressions: ${t.viewCount || 0}\nDate: ${dateStr}\nAuthor: ${t.author?.name || "Unknown"}\nPhotoUrl: ${photo || "N/A"}\n`;
        if (i < arr.length - 1) out += "\n---\n\n";
      });
      return out;
    }
    const formattedTweets = parseToOpenAI(apifyData);
    logStep("Formatted tweets for analysis");

    // 9) Call OpenAI for main analysis (CREATIVE COLORFUL STYLE)
    logStep("Calling OpenAI for creative content analysis and vibrant storytelling");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");
    
    const analysisSystemPrompt = `You are a creative content strategist and storyteller for "Creative Colorful" newsletters by LetterNest. Your task is to analyze tweets and transform them into vibrant, engaging, and creatively structured content that feels fresh and dynamic.

CAPABILITIES:
- Identify 4-5 compelling story themes that capture imagination
- Create vivid, engaging narratives with creative flair
- Design content with varied visual structures (callout boxes, creative quotes, visual breaks)
- Generate compelling hooks and creative section titles
- Select vibrant imagery to enhance storytelling

OUTPUT STRUCTURE:
1.  **CREATIVE HOOK:** A 1-2 sentence attention-grabbing opener with personality
2.  **MAIN STORY THEMES (4-5 identified):**
    *   **Theme Title:** Creative, engaging, memorable
    *   **The Spark:** 3-4 sentence captivating introduction
    *   **Key Highlights:** 4-5 dynamic bullet points (60-80 words each, with personality)
    *   **Creative Deep Dive:** A substantial section (400-500 words) with:
        *   Engaging storytelling paragraphs
        *   **Creative callout boxes** for key insights (labeled as "SPOTLIGHT:", "GAME CHANGER:", "WHY IT MATTERS:")
        *   **Visual quotes** for memorable statements (labeled as "QUOTE SPOTLIGHT:")
        *   **Trend alerts** for emerging patterns (labeled as "TREND ALERT:")
    *   **RepresentativeImageURL:** Most compelling visual content
3.  **CREATIVE SIDEBARS (3-4 identified):**
    *   **Sidebar Title:** Short, punchy, creative
    *   **Quick Insight:** 2-3 engaging sentences with flair
    *   **RepresentativeImageURL:** Relevant supporting image

CRITICAL INSTRUCTIONS:
- NO direct tweet quotes, IDs, or authors
- Focus on creative storytelling and dynamic presentation
- Tone: Energetic, engaging, accessible, with creative flair
- Use vivid language and compelling narratives
- Actively include images for all themes/sidebars
- Create content that feels alive and dynamic

Tweet data to analyze:
${formattedTweets}`;
    
    const analysisUserPrompt = `Transform the tweet collection into a vibrant "Creative Colorful" newsletter:
1.  CREATIVE HOOK (1-2 sentences with energy and personality)
2.  4-5 MAIN STORY THEMES, each with:
    *   Creative Theme Title
    *   "The Spark" (3-4 captivating sentences)
    *   4-5 "Key Highlights" (dynamic bullets, 60-80 words each)
    *   "Creative Deep Dive" (400-500 words) with creative callouts, visual quotes, and trend alerts
    *   'RepresentativeImageURL'
3.  3-4 CREATIVE SIDEBARS, each with:
    *   Punchy Sidebar Title
    *   "Quick Insight" (2-3 engaging sentences)
    *   'RepresentativeImageURL'

Create content that feels vibrant, engaging, and creatively structured with compelling storytelling.

Tweet collection:
${formattedTweets}`;
    
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: analysisSystemPrompt },
          { role: "user", content: analysisUserPrompt }
        ],
        temperature: 0.7,
        max_tokens: 10000
      })
    });
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(`OpenAI API error (${openaiRes.status}):`, txt);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    const openaiJson = await openaiRes.json();
    let analysisResult = openaiJson.choices[0].message.content.trim();
    logStep("Successfully generated creative content analysis");

    // Skip Perplexity integration for creative template to maintain fast generation

    // 10) Generate Markdown formatted newsletter (CREATIVE COLORFUL STYLE)
    let markdownNewsletter = "";
    try {
      logStep("Starting 'Creative Colorful' markdown newsletter formatting");
      const markdownSystemPrompt = `You are a creative newsletter designer for "Creative Colorful" by LetterNest. Format pre-analyzed creative content into clean, well-structured Markdown.

NEWSLETTER STRUCTURE:
1. HEADER: Title (H1), Date (H3), Simple divider (---)
2. INTRODUCTION: The creative hook
3. MAIN SECTIONS: For each theme:
   - Section Title (H2)
   - Introduction paragraph
   - Image: ![alt text](ImageURL) if available
   - Key points as bullet list
   - Detailed content in paragraphs
   - Simple divider (---)
4. SIDEBARS: 
   - Section Title (H2 "Quick Insights")
   - Each sidebar as H3 with content
   - Images where available
5. FOOTER: Simple closing

FORMATTING GUIDELINES:
- Use standard Markdown syntax only
- Include images as: ![Description](URL)
- Use --- for dividers
- Keep structure simple and clean
- Avoid complex HTML or styling

OUTPUT: Clean, standard Markdown only.`;
      
      const markdownUserPrompt = `Format this creative analysis into the "Creative Colorful" Markdown newsletter with vibrant styling and dynamic visual elements.
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
CREATIVE CONTENT ANALYSIS:
${analysisResult}`;
      
      try {
        const markdownOpenaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4.1-2025-04-14",
            messages: [
              { role: "system", content: markdownSystemPrompt },
              { role: "user", content: markdownUserPrompt }
            ],
            temperature: 0.3, max_tokens: 10000
          })
        });
        if (markdownOpenaiRes.ok) {
          const markdownJson = await markdownOpenaiRes.json();
          markdownNewsletter = markdownJson.choices[0].message.content;
          logStep("'Creative Colorful' Markdown generated successfully");
        } else {
          const errorText = await markdownOpenaiRes.text();
          console.error(`Markdown formatting OpenAI error (${markdownOpenaiRes.status}):`, errorText);
          markdownNewsletter = `Error: Unable to generate markdown. Analysis:\n${analysisResult}`;
        }
      } catch (markdownError) {
        console.error("Error in markdown formatting API call:", markdownError);
        markdownNewsletter = `Error: API error in markdown. Analysis:\n${analysisResult}`;
      }
    } catch (err) {
      console.error("Error generating Markdown newsletter:", err);
      markdownNewsletter = `Error: Failed to generate markdown. Analysis:\n${analysisResult}`;
    }

    // 11) Generate Enhanced Markdown with Creative Colorful UI/UX
    let enhancedMarkdownNewsletter = markdownNewsletter;
    try {
      logStep("Generating enhanced UI/UX markdown with refined creative color scheme");
      const enhancedSystemPrompt = `
You are a creative newsletter UI/UX specialist. Transform "Creative Colorful" markdown into clean, well-structured markdown with improved colors and formatting.

REFINED CREATIVE COLOR PALETTE:
- Deep Navy: #1a365d (main headers)
- Refined Blue: #2d5a87 (sub headers) 
- Sage Green: #81a084 (accents)
- Soft Coral: #e57373 (highlights)
- Warm Taupe: #8d7053 (variety)

ENHANCEMENT RULES:
1. Keep the markdown structure clean and simple
2. Add HTML styling only for special callouts:
   - SPOTLIGHT sections: Use soft coral backgrounds
   - GAME CHANGER sections: Use sage green backgrounds  
   - WHY IT MATTERS sections: Use soft lavender backgrounds
3. Ensure all sections have proper spacing
4. Use clear, readable formatting
5. Include images where specified in the original content

OUTPUT: Clean, enhanced markdown with minimal inline HTML for special sections only.
`;
      
      const enhancedUserPrompt = `
Transform this Creative Colorful markdown into a cleaner, better-formatted version:
- Fix any formatting issues
- Add subtle styling for callout sections
- Ensure proper image placement
- Maintain the creative energy but improve readability

Creative Colorful Markdown:
${markdownNewsletter}
`;
      
      try {
        const enhancedOpenaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4.1-2025-04-14", 
            messages: [
              { role: "system", content: enhancedSystemPrompt },
              { role: "user", content: enhancedUserPrompt }
            ],
            temperature: 0.1, max_tokens: 10000 
          })
        });
        if (enhancedOpenaiRes.ok) {
          const enhancedJson = await enhancedOpenaiRes.json();
          enhancedMarkdownNewsletter = enhancedJson.choices[0].message.content;
          logStep("Enhanced Creative Colorful markdown with refined colors generated");
        } else {
          const errorText = await enhancedOpenaiRes.text();
          console.error(`Enhanced Markdown formatting OpenAI error (${enhancedOpenaiRes.status}):`, errorText);
        }
      } catch (enhancedError) {
        console.error("Error in enhanced UI/UX markdown formatting API call:", enhancedError);
      }
    } catch (err) {
      console.error("Error generating Enhanced Creative Colorful Markdown newsletter:", err);
    }

    // 12) Clean up stray text around enhanced Markdown
    function cleanMarkdown(md: string): string {
      let cleaned = md.replace(/^```(?:markdown)?\s*([\s\S]*?)\s*```$/i, '$1');
      cleaned = cleaned.trim();
      const lines = cleaned.split('\n');
      for(let i = 0; i < lines.length; i++){
        if (lines[i].trim() !== "") {
          if (!lines[i].trim().startsWith("#") && !lines[i].trim().startsWith("<h1") && !lines[i].trim().startsWith("<div")) {
            const headingMatch = cleaned.match(/(^|\n)(#+\s.*|<h[1-6].*>|<div.*>)/);
            if (headingMatch && typeof headingMatch.index === 'number' && headingMatch.index > 0) {
              if (cleaned.substring(0, headingMatch.index).trim().length > 0) {
                cleaned = cleaned.substring(headingMatch.index).trim();
              }
            }
          }
          break;
        }
      }
      return cleaned;
    }
    const finalMarkdown = cleanMarkdown(enhancedMarkdownNewsletter);
    logStep("Cleaned up final Creative Colorful markdown");

    // 13) Convert final Markdown to HTML with proper structure and error handling
    let htmlBody = "";
    try {
        const renderer = new marked.Renderer();
        
        // Enhanced paragraph rendering
        renderer.paragraph = (text) => {
            // Don't wrap already formatted divs
            if (text.trim().startsWith('<div') || text.trim().startsWith('<span')) {
                return text.trim() + '\n';
            }
            return `<p style="margin: 0 0 16px 0; line-height: 1.6; font-size: 16px; color: #2d3748; font-family: Arial, sans-serif;">${text}</p>\n`;
        };

        // Enhanced list rendering  
        renderer.list = (body, ordered, start) => {
            const type = ordered ? 'ol' : 'ul';
            const startAttr = (ordered && start !== 1) ? ` start="${start}"` : '';
            return `<${type}${startAttr} style="margin: 16px 0; padding-left: 24px;">\n${body}</${type}>\n`;
        };

        renderer.listitem = (text, task, checked) => {
            if (task) {
                return `<li style="margin: 8px 0;"><input type="checkbox" ${checked ? 'checked' : ''} disabled style="margin-right: 8px;"> ${text}</li>\n`;
            }
            return `<li style="margin: 8px 0; font-size: 16px; line-height: 1.5; color: #2d3748;">${text}</li>\n`;
        };

        // Professional heading renderer
        renderer.heading = (text, level) => {
            const styles = {
                1: 'color: #1a365d; font-size: 28px; margin: 24px 0 16px 0; font-weight: 700; font-family: Georgia, serif;',
                2: 'color: #2d5a87; font-size: 22px; margin: 28px 0 14px 0; font-weight: 600; font-family: Arial, sans-serif;',
                3: 'color: #81a084; font-size: 18px; margin: 24px 0 12px 0; font-weight: 600; font-family: Arial, sans-serif;',
                4: 'color: #1a365d; font-size: 16px; margin: 20px 0 10px 0; font-weight: 600; font-family: Arial, sans-serif;',
                5: 'color: #2d5a87; font-size: 14px; margin: 16px 0 8px 0; font-weight: 600; font-family: Arial, sans-serif;',
                6: 'color: #81a084; font-size: 14px; margin: 16px 0 8px 0; font-weight: 600; font-family: Arial, sans-serif;'
            };
            
            const style = styles[level as keyof typeof styles] || styles[4];
            return `<h${level} style="${style}">${text}</h${level}>\n`;
        };

        // Professional image renderer
        renderer.image = (href, _title, alt) => {
            return `<div style="text-align: center; margin: 24px 0;">
                <img src="${href}" alt="${alt || 'Newsletter image'}" 
                     style="max-width: 100%; height: auto; border-radius: 8px; 
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
            </div>\n`;
        };

        // Enhanced blockquote renderer
        renderer.blockquote = (quote) => {
            return `<blockquote style="margin: 20px 0; padding: 16px 20px; 
                                       border-left: 4px solid #81a084; 
                                       background-color: #f7fafc; 
                                       font-style: italic; 
                                       color: #2d5a87;">
                ${quote}
            </blockquote>\n`;
        };

        // Enhanced horizontal rule
        renderer.hr = () => {
            return `<hr style="border: none; height: 2px; 
                               background: linear-gradient(to right, #e57373, #81a084, #9575cd); 
                               margin: 32px 0; border-radius: 1px;">\n`;
        };

        // Configure marked options for better parsing
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });

        htmlBody = marked.parse(finalMarkdown, { renderer });
        
        // Clean up any malformed HTML
        htmlBody = htmlBody
            .replace(/(<\/[^>]+>)\s*(<[^>\/][^>]*>)/g, '$1\n$2') // Add line breaks between tags
            .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
            .trim();
        
        logStep("Generated clean HTML body", { length: htmlBody.length });
        
    } catch (htmlError) {
        console.error("Error converting markdown to HTML:", htmlError);
        // Fallback: create simple HTML from markdown
        htmlBody = `<div style="color: #2d3748; font-family: Arial, sans-serif; line-height: 1.6;">
            <h1 style="color: #1a365d;">Creative Colorful Newsletter</h1>
            <p>Your newsletter content is being processed. Please check your email for the latest version.</p>
            <hr>
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${finalMarkdown}</pre>
        </div>`;
        logStep("Used fallback HTML due to conversion error");
    }

    // Generate the final email HTML with proper structure and refined creative design
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creative Colorful Newsletter</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset styles */
        body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; }
        
        /* Mobile styles */
        @media screen and (max-width: 600px) {
            .mobile-hide { display: none !important; }
            .mobile-full { width: 100% !important; }
            .mobile-padding { padding: 10px !important; }
            .mobile-text { font-size: 16px !important; line-height: 1.5 !important; }
            .mobile-header { font-size: 24px !important; }
        }
        
        @media print {
            body { background-color: #ffffff !important; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: Arial, sans-serif;">
    <!-- Main container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f7fafc;">
        <tr>
            <td style="padding: 20px 0;">
                <!-- Email wrapper -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="650" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 25px rgba(26,54,93,0.1);" class="mobile-full">
                    <tr>
                        <td style="padding: 24px;" class="mobile-padding">
                            <!-- Content area -->
                            <div style="color: #2d3748; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif;">
                                ${htmlBody}
                            </div>
                        </td>
                    </tr>
                </table>
                
                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="650" style="margin: 20px auto 0;" class="mobile-full">
                    <tr>
                        <td style="text-align: center; padding: 20px; color: #81a084; font-size: 14px; font-family: Arial, sans-serif;">
                            ✨ Crafted with creativity by <strong style="color: #1a365d;">LetterNest</strong> ✨<br>
                            <span style="color: #888; font-size: 12px;">Creative Newsletter Generation</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    // Generate the final email HTML with proper structure and refined creative design
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creative Colorful Newsletter</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset styles */
        body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; }
        
        /* Mobile styles */
        @media screen and (max-width: 600px) {
            .mobile-hide { display: none !important; }
            .mobile-full { width: 100% !important; }
            .mobile-padding { padding: 10px !important; }
            .mobile-text { font-size: 16px !important; line-height: 1.5 !important; }
            .mobile-header { font-size: 24px !important; }
        }
        
        @media print {
            body { background-color: #ffffff !important; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: Arial, sans-serif;">
    <!-- Main container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f7fafc;">
        <tr>
            <td style="padding: 20px 0;">
                <!-- Email wrapper -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="650" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 25px rgba(26,54,93,0.1);" class="mobile-full">
                    <tr>
                        <td style="padding: 24px;" class="mobile-padding">
                            <!-- Content area -->
                            <div style="color: #2d3748; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif;">
                                ${htmlBody}
                            </div>
                        </td>
                    </tr>
                </table>
                
                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="650" style="margin: 20px auto 0;" class="mobile-full">
                    <tr>
                        <td style="text-align: center; padding: 20px; color: #81a084; font-size: 14px; font-family: Arial, sans-serif;">
                            ✨ Crafted with creativity by <strong style="color: #1a365d;">LetterNest</strong> ✨<br>
                            <span style="color: #888; font-size: 12px;">Creative Newsletter Generation</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    logStep("Generated Creative Colorful email HTML with proper structure");

    // 14) Send email via Resend
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@newsletters.letternest.ai"; 
      const emailSubject = `Creative Colorful: Your Vibrant Newsletter from LetterNest`; 
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `LetterNest <${fromEmail}>`, 
        to: profile.sending_email, 
        subject: emailSubject, 
        html: emailHtml, 
        text: finalMarkdown 
      });
      if (emailError) { 
        console.error("Error sending email with Resend:", emailError); 
        throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`); 
      }
      logStep("Creative Colorful Email sent successfully", { id: emailData?.id });
    } catch (sendErr) { 
      console.error("Error sending email:", sendErr); 
      // Continue with saving to database even if email fails
    }

    // 15) Save newsletter and update generations
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({ 
        user_id: userId, 
        markdown_text: finalMarkdown 
      });
      if (storageError) { 
        console.error("Failed to save Creative Colorful newsletter to storage:", storageError); 
      } else { 
        logStep("Creative Colorful Newsletter successfully saved to storage"); 
      }
    } catch (storageErr) { 
      console.error("Error saving Creative Colorful newsletter to storage:", storageErr); 
    }

    // Update remaining generations count
    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase.from("profiles").update({ 
        remaining_newsletter_generations: newCount 
      }).eq("id", userId);
      if (updateError) { 
        console.error("Failed to update remaining generations:", updateError); 
      } else { 
        logStep("Updated remaining generations count", { newCount }); 
      }
    }

    // 16) Final response
    const timestamp = new Date().toISOString();
    logStep("Creative Colorful newsletter generation successful with refined design", {
      userId, 
      timestamp, 
      tweetCount: selectedCount,
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0
    });
    
    return {
      status: "success",
      message: "Creative Colorful newsletter generated and emailed successfully",
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
      data: { 
        analysisResult, 
        markdownNewsletter: finalMarkdown, 
        timestamp 
      }
    };
    
  } catch (error) {
    console.error("Error in Creative Colorful newsletter generation:", error);
    return {
      status: "error",
      message: (error as Error).message || "Internal server error during Creative Colorful generation"
    };
  }
}

// Main serve function
serve(async (req: Request) => {
  if (req.method === "OPTIONS") { 
    return new Response(null, { headers: corsHeaders }); 
  }
  
  try {
    logStep("Starting Creative Colorful newsletter generation process");
    
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(JSON.stringify({ 
        error: "Invalid selection. Please choose 10, 20, or 30 tweets." 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "No authorization header" 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(JSON.stringify({ 
        error: "Authentication failed" 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    // Start background task
    const backgroundTask = generateNewsletter(user.id, selectedCount, jwt);
    
    // @ts-ignore 
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) { 
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      backgroundTask.then(result => { 
        logStep("Background task completed (local/fallback)", result); 
      }).catch(err => { 
        console.error("Background task error (local/fallback):", err); 
      });
    }
    
    return new Response(JSON.stringify({
      status: "processing",
      message: "Your Creative Colorful newsletter generation has started. You will receive an email when it's ready.",
    }), { 
      status: 202, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
    
  } catch (error) {
    console.error("Error in third-template function:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error" 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});

    // 14) Send email via Resend
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@newsletters.letternest.ai"; 
      const emailSubject = `Creative Colorful: Your Vibrant Newsletter from LetterNest`; 
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `LetterNest <${fromEmail}>`, to: profile.sending_email, subject: emailSubject, html: emailHtml, text: finalMarkdown 
      });
      if (emailError) { console.error("Error sending email with Resend:", emailError); throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`); }
      logStep("Creative Colorful Email sent successfully", { id: emailData?.id });
    } catch (sendErr) { console.error("Error sending email:", sendErr); }

    // 15) Save newsletter and update generations
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({ user_id: userId, markdown_text: finalMarkdown });
      if (storageError) { console.error("Failed to save Creative Colorful newsletter to storage:", storageError); } 
      else { logStep("Creative Colorful Newsletter successfully saved to storage"); }
    } catch (storageErr) { console.error("Error saving Creative Colorful newsletter to storage:", storageErr); }

    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase.from("profiles").update({ remaining_newsletter_generations: newCount }).eq("id", userId);
      if (updateError) { console.error("Failed to update remaining generations:", updateError); } 
      else { logStep("Updated remaining generations count", { newCount }); }
    }

    const timestamp = new Date().toISOString();
    logStep("Creative Colorful newsletter generation successful with refined design", {
      userId, timestamp, tweetCount: selectedCount,
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0
    });
    return {
      status: "success",
      message: "Creative Colorful newsletter generated and emailed successfully",
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
      data: { analysisResult, markdownNewsletter: finalMarkdown, timestamp }
    };
  } catch (error) {
    console.error("Error in Creative Colorful newsletter generation:", error);
    return {
      status: "error",
      message: (error as Error).message || "Internal server error during Creative Colorful generation"
    };
  }
}

// Main serve function
serve(async (req: Request) => {
  if (req.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
  try {
    logStep("Starting Creative Colorful newsletter generation process");
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(JSON.stringify({ error: "Invalid selection. Please choose 10, 20, or 30 tweets." }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(JSON.stringify({ error: "Authentication failed" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const backgroundTask = generateNewsletter(user.id, selectedCount, jwt);
    // @ts-ignore 
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) { // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      backgroundTask.then(result => { logStep("Background task completed (local/fallback)", result); })
      .catch(err => { console.error("Background task error (local/fallback):", err); });
    }
    return new Response(JSON.stringify({
      status: "processing",
      message: "Your Creative Colorful newsletter generation has started. You will receive an email when it's ready.",
    }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in third-template function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
