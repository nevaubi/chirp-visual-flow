import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@4.3.0";
import juice from "https://esm.sh/juice@11.0.0";
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
  console.log(`[TWIN-FOCUS-NEWSLETTER] ${step}${detailsStr}`);
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

    // 9) Call OpenAI for main analysis (MODIFIED FOR TWIN FOCUS STRUCTURE)
    logStep("Calling OpenAI for Twin Focus analysis and structure generation");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");
    
    const analysisSystemPrompt = `You are an expert content strategist and newsletter designer for LetterNest's "Twin Focus" template. Your task is to analyze a collection of tweets and synthesize them into a dual-perspective, structured format that showcases contrasting viewpoints, comparative insights, or complementary topics side-by-side.

TWIN FOCUS CONCEPT:
The Twin Focus template emphasizes presenting information in a balanced, dual-column approach where topics are explored from multiple angles or where related themes are presented in parallel for easy comparison and contrast.

CAPABILITIES:
- Identify 3-4 main topic pairs or contrasting perspectives
- For each "twin focus," provide balanced viewpoints or complementary angles
- Create structured content that works well in side-by-side layouts
- Generate compelling headlines and balanced analysis
- Select relevant imagery for each focus area

OUTPUT STRUCTURE:
1. **NEWSLETTER HEADLINE:** A compelling title that captures the dual-perspective approach
2. **TWIN FOCUS PAIRS (3-4 identified):**
   Each pair contains:
   - **Pair Title:** Descriptive title for the twin focus (e.g., "AI Innovation vs. AI Regulation")
   - **Focus A Title:** Left side perspective/topic
   - **Focus A Summary:** 3-4 sentences covering this perspective
   - **Focus A Key Points:** 3-4 bullet points (40-50 words each)
   - **Focus A Image URL:** Representative image if available, or "N/A"
   - **Focus B Title:** Right side perspective/topic  
   - **Focus B Summary:** 3-4 sentences covering this perspective
   - **Focus B Key Points:** 3-4 bullet points (40-50 words each)
   - **Focus B Image URL:** Representative image if available, or "N/A"
   - **Bridge Insight:** 2-3 sentences connecting the two perspectives
3. **ADDITIONAL INSIGHTS (2-3 identified):**
   - **Insight Title:** Brief, descriptive
   - **Quick Analysis:** 2-3 sentences of analysis
   - **Representative Image URL:** If available, or "N/A"

CRITICAL INSTRUCTIONS:
- NO direct tweet quotes, IDs, or authors
- Focus on contrasts, comparisons, and complementary viewpoints
- Tone: Professional yet accessible, balanced analysis
- Write with natural flow, 10th-grade reading level
- Actively seek and include image URLs for all sections
- Structure content for side-by-side presentation

Tweet data to analyze:
${formattedTweets}`;
    
    const analysisUserPrompt = `Based on the tweet collection, generate content for the "Twin Focus" newsletter template:

1. NEWSLETTER HEADLINE (engaging, captures dual-perspective theme)
2. 3-4 TWIN FOCUS PAIRS, each with:
   - Pair Title
   - Focus A: Title, Summary (3-4 sentences), Key Points (3-4 bullets, 40-50 words each), Image URL
   - Focus B: Title, Summary (3-4 sentences), Key Points (3-4 bullets, 40-50 words each), Image URL  
   - Bridge Insight (2-3 sentences connecting the perspectives)
3. 2-3 ADDITIONAL INSIGHTS, each with:
   - Insight Title
   - Quick Analysis (2-3 sentences)
   - Representative Image URL

Focus on creating balanced, comparative content suitable for side-by-side presentation.

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
        temperature: 0.4,
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
    logStep("Successfully generated Twin Focus analysis");

    // 10) Topic Selection and Query Generation for Perplexity
    logStep("Selecting topics and generating search queries for Perplexity");
    const queryGenerationPrompt = `You are an expert at identifying promising focus areas for web search enrichment. Given a Twin Focus analysis, select up to 3 focus areas that would benefit most from additional web-based context.
TASK: Review analysis, select up to 3 focus areas (relevance, complexity, value). For each: search query (25-50 chars), enrichment goal.
FORMAT:
===
FOCUS 1: [Focus Area Name]
QUERY: [Search Query]
ENRICHMENT GOAL: [Goal]
... (up to 3)
===
TWIN FOCUS ANALYSIS:
${analysisResult}`;

    const queryGenRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14", 
        messages: [
          { role: "system", content: "You are a search query optimization specialist." },
          { role: "user", content: queryGenerationPrompt }
        ],
        temperature: 0.3, max_tokens: 10000
      })
    });
    let webEnrichmentContent: { focusName: string; webSummary: string; sources: any[] }[] | null = null;
    if (!queryGenRes.ok) {
      const txt = await queryGenRes.text();
      console.error(`OpenAI query generation error (${queryGenRes.status}):`, txt);
      logStep("Failed to generate search queries, continuing without Perplexity enrichment");
    } else {
      const queryGenJson = await queryGenRes.json();
      const searchQueriesText = queryGenJson.choices[0].message.content.trim();
      logStep("Successfully generated search queries", { searchQueriesText });
      const focusAreasToEnrich: { focus: string; query: string; goal: string }[] = [];
      const regex = /FOCUS \d+:\s*(.+?)\s*QUERY:\s*(.+?)\s*ENRICHMENT GOAL:\s*(.+?)(?=\n\s*FOCUS \d+:|$)/gis;
      let match;
      while ((match = regex.exec(searchQueriesText)) !== null) {
        focusAreasToEnrich.push({ focus: match[1].trim(), query: match[2].trim(), goal: match[3].trim() });
      }
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      if (!PERPLEXITY_API_KEY || focusAreasToEnrich.length === 0) {
        logStep("Missing Perplexity API key or no focus areas to enrich, continuing without web enrichment");
      } else {
        logStep("Making Perplexity API calls for web enrichment", { focusAreasCount: focusAreasToEnrich.length });
        const enrichmentResults = [];
        for (const focusArea of focusAreasToEnrich) {
          try {
            const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
                body: JSON.stringify({ model: "sonar-pro", messages: [{ role: "user", content: focusArea.query }], temperature: 0.2, max_tokens: 400 })
            });
            if (perplexityRes.ok) {
              const data = await perplexityRes.json();
              enrichmentResults.push({ focusName: focusArea.focus, webSummary: data.choices[0].message.content, sources: data.choices[0].message.citations ?? [] });
              logStep(`Successfully enriched focus area: ${focusArea.focus}`);
            } else {
              console.error(`Perplexity API error for "${focusArea.query}": ${perplexityRes.status}`, await perplexityRes.text());
              enrichmentResults.push({ focusName: focusArea.focus, webSummary: `[Perplexity error ${perplexityRes.status}]`, sources: [] });
            }
          } catch (err) {
            console.error(`Perplexity fetch failed for "${focusArea.query}":`, err);
            enrichmentResults.push({ focusName: focusArea.focus, webSummary: "[Perplexity request failed]", sources: [] });
          }
        }
        if (enrichmentResults.length > 0) { webEnrichmentContent = enrichmentResults; logStep("Web enrichment data collected"); }
      }
    }

    // 12) Integrate Web Content
    let finalAnalysisForMarkdown = analysisResult; 
    if (webEnrichmentContent && webEnrichmentContent.length > 0) {
        logStep("Integrating web content with original Twin Focus analysis");
        const integrationPrompt = `You are an expert content editor. Integrate web-sourced insights into the provided Twin Focus analysis.
RULES: Maintain original structure. For focus areas with web enrichment, weave 2-3 points from 'webSummary' into relevant sections, under "Current Context:" (make this substantial, 80-120 words if possible). Mention sources concisely. Ensure smooth flow.
ORIGINAL ANALYSIS:
${analysisResult}
WEB-SOURCED INFO:
${JSON.stringify(webEnrichmentContent, null, 2)}
Provide complete, integrated analysis.`;
        const integrationRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: "gpt-4.1-2025-04-14",
                messages: [
                    { role: "system", content: "You are an expert content editor, skilled at seamlessly integrating supplementary information to create richer, more detailed texts." },
                    { role: "user", content: integrationPrompt }
                ],
                temperature: 0.3, max_tokens: 10000
            })
        });
        if (integrationRes.ok) {
            const integrationJson = await integrationRes.json();
            finalAnalysisForMarkdown = integrationJson.choices[0].message.content.trim();
            logStep("Successfully integrated web content with Twin Focus analysis");
        } else {
            const txt = await integrationRes.text();
            console.error(`OpenAI integration error (${integrationRes.status}):`, txt);
            logStep("Failed to integrate web content, continuing with original Twin Focus analysis");
        }
    }

    // 13) Generate Markdown formatted newsletter (MODIFIED FOR TWIN FOCUS STRUCTURE)
    let markdownNewsletter = "";
    try {
      logStep("Starting 'Twin Focus' markdown newsletter formatting");
      const markdownSystemPrompt = `You are a professional newsletter editor for LetterNest's "Twin Focus" template. Format pre-analyzed dual-perspective content into clean, beautiful, visually appealing, well-structured Markdown optimized for side-by-side layouts.

NEWSLETTER STRUCTURE:
1. HEADER: Newsletter title (H1), Date (H3/Subtitle), Horizontal rule
2. INTRODUCTION: Brief intro explaining the dual-focus approach
3. TWIN FOCUS SECTIONS: For each twin focus pair:
   - Section Title (H2)
   - Two-column content structure using tables or side-by-side formatting
   - Focus A and Focus B presented in parallel
   - Images integrated where available
   - Bridge insight connecting the perspectives
4. ADDITIONAL INSIGHTS: Supplementary analysis sections
5. FOOTER: Horizontal rule, "Generated by LetterNest"

FORMATTING GUIDELINES:
- Clean Markdown with generous white space
- Use tables for side-by-side content presentation where appropriate
- Include images from analysis where valid URLs are provided
- Professional, balanced tone that presents multiple perspectives fairly
- Mobile-friendly formatting that degrades gracefully
- Use bold and italic formatting for emphasis

OUTPUT: ONLY the formatted Markdown content.`;
      
      const markdownUserPrompt = `Format this Twin Focus analysis into a professional Markdown newsletter. Use tables or side-by-side formatting for the twin focus pairs. Include images where provided.
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
TWIN FOCUS ANALYSIS CONTENT:
${finalAnalysisForMarkdown}`;
      
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
            temperature: 0.2, max_tokens: 10000
          })
        });
        if (markdownOpenaiRes.ok) {
          const markdownJson = await markdownOpenaiRes.json();
          markdownNewsletter = markdownJson.choices[0].message.content;
          logStep("'Twin Focus' Markdown generated successfully");
        } else {
          const errorText = await markdownOpenaiRes.text();
          console.error(`Markdown formatting OpenAI error (${markdownOpenaiRes.status}):`, errorText);
          markdownNewsletter = `Error: Unable to generate markdown. Analysis:\n${finalAnalysisForMarkdown}`;
        }
      } catch (markdownError) {
        console.error("Error in markdown formatting API call:", markdownError);
        markdownNewsletter = `Error: API error in markdown. Analysis:\n${finalAnalysisForMarkdown}`;
      }
    } catch (err) {
      console.error("Error generating Markdown newsletter:", err);
      markdownNewsletter = `Error: Failed to generate markdown. Analysis:\n${finalAnalysisForMarkdown}`;
    }

    // 14) Generate Enhanced Markdown with UI/UX (TWIN FOCUS COLOR SCHEME)
    let enhancedMarkdownNewsletter = markdownNewsletter;
    try {
      logStep("Generating enhanced UI/UX markdown with Twin Focus color scheme");
      const enhancedSystemPrompt = `
You are a newsletter UI/UX specialist. Your goal is to take "Twin Focus" markdown and output a **visually enhanced** markdown document using inline HTML/CSS with a sophisticated dual-tone color palette.

TWIN FOCUS COLOR PALETTE & STYLING:
- **Primary Emerald (Left Focus):** #047857 (Use for left-side content, headers)
- **Primary Teal (Right Focus):** #0d9488 (Use for right-side content, headers) 
- **Accent Green (Highlights):** #10b981 (Use for bridges, connections, key callouts)
- **Neutral Gray (Body Text):** #374151 (Standard readable text)
- **Light Backgrounds:** #f0fdf4 (emerald tint) and #f0fdfa (teal tint)
- **Font:** "Inter, system-ui, -apple-system, sans-serif" (Modern, clean typeface)

ENHANCEMENT RULES:
1. **Twin Focus Headers:**
   - H1: \`<h1 style="color: #047857; margin-bottom: 8px; font-weight: 700; font-family: 'Inter', system-ui, sans-serif;">Twin Focus Newsletter</h1>\`
   - H2: Wrap content in \`<span style="color: #047857; font-weight: 600; font-size: 24px;">\` for main sections
   - H3: Use alternating colors - emerald for left focus, teal for right focus

2. **Side-by-Side Layouts:**
   - Tables: Style with alternating background colors for left/right columns
   - Left column: \`background-color: #f0fdf4; color: #047857;\`
   - Right column: \`background-color: #f0fdfa; color: #0d9488;\`
   - Bridge sections: \`background-color: #ecfdf5; border-left: 4px solid #10b981;\`

3. **Professional Layout & Spacing:**
   - Paragraphs: Add \`style="margin-bottom: 1.2em; line-height: 1.7; color: #374151; font-family: 'Inter', system-ui, sans-serif;"\`
   - Tables: Professional borders and padding for clean separation

4. **Enhanced Special Structures:**
   - **Bridge Insights**: Transform into distinctive callout boxes:
     \`<div style="background-color: #ecfdf5; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;"><strong style="color: #047857;">Connection:</strong> <span style="color: #374151;">[bridge content]</span></div>\`

5. **Professional List Styling:**
   - Left focus lists: \`<li style="color: #047857; margin-bottom: 8px;"><span style="color: #374151;">[content]</span></li>\`
   - Right focus lists: \`<li style="color: #0d9488; margin-bottom: 8px;"><span style="color: #374151;">[content]</span></li>\`

6. **Section Dividers:**
   - Replace markdown '---' with: \`<div style="height: 2px; background: linear-gradient(to right, #f0fdf4, #10b981, #f0fdfa); margin: 30px 0; border-radius: 1px;"></div>\`

Transform the markdown below into a visually enhanced, dual-tone newsletter.
`;
      
      const enhancedUserPrompt = `
Transform the "Twin Focus" markdown below into a **professionally enhanced** version using the emerald-teal color scheme and dual-column styling. Pay special attention to:
- Dual-tone color scheme reflecting the twin focus concept
- Enhanced table styling for side-by-side content
- Bridge insight callout boxes
- Professional typography and spacing

"Twin Focus" Markdown Draft:
<current newsletter>
${markdownNewsletter}
</current newsletter>
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
            temperature: 0.1,
            max_tokens: 10000 
          })
        });
        if (enhancedOpenaiRes.ok) {
          const enhancedJson = await enhancedOpenaiRes.json();
          enhancedMarkdownNewsletter = enhancedJson.choices[0].message.content;
          logStep("Enhanced UI/UX markdown with Twin Focus color scheme generated");
        } else {
          const errorText = await enhancedOpenaiRes.text();
          console.error(`Enhanced Markdown formatting OpenAI error (${enhancedOpenaiRes.status}):`, errorText);
        }
      } catch (enhancedError) {
        console.error("Error in enhanced UI/UX markdown formatting API call:", enhancedError);
      }
    } catch (err) {
      console.error("Error generating Enhanced UI/UX Markdown newsletter:", err);
    }

    // 15) Clean up stray text around enhanced Markdown
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
    logStep("Cleaned up final markdown for 'Twin Focus'");

    // 16) Convert final Markdown to HTML & inline CSS (TWIN FOCUS STYLING)
    const renderer = new marked.Renderer();
    
    // Override paragraph rendering with Twin Focus styling
    renderer.paragraph = (text) => {
        if (text.trim().startsWith('<div style="height: 2px;') || text.trim().startsWith('<div style="background-color:')) {
            return text.trim() + '\n';
        }
        return `<p style="margin: 0 0 1.3em 0; line-height: 1.7; font-size: 16px; color: #374151; font-family: 'Inter', system-ui, -apple-system, sans-serif;">${text}</p>\n`;
    };

    // Twin Focus list item rendering
    renderer.listitem = (text, task, checked) => {
      if (task) {
        return `<li class="task-list-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled> ${text}</li>\n`;
      }
      return `<li style="margin: 0 0 0.8em 0; font-size: 16px; line-height: 1.6; color: #047857; font-family: 'Inter', system-ui, -apple-system, sans-serif;"><span style="color: #374151;">${text}</span></li>\n`;
    };

    // Twin Focus heading renderer
    renderer.heading = (text, level) => {
      const colors = {
        1: '#047857',
        2: '#047857', 
        3: '#0d9488'
      };
      const sizes = {
        1: '30px',
        2: '24px',
        3: '20px'
      };
      const weights = {
        1: '700',
        2: '600',
        3: '500'
      };
      
      const color = colors[level as keyof typeof colors] || '#047857';
      const size = sizes[level as keyof typeof sizes] || '18px';
      const weight = weights[level as keyof typeof weights] || '500';
      
      return `<h${level} style="color:${color};
                               font-size:${size};
                               margin:1.4em 0 0.7em;
                               font-weight:${weight};
                               font-family: 'Inter', system-ui, -apple-system, sans-serif;">${text}</h${level}>\n`;
    };

    // Twin Focus image renderer
    renderer.image = (href, _title, alt) => `
      <div class="image-container" style="text-align:center; margin: 20px 0 30px; padding: 0;">
        <img src="${href}"
             alt="${alt || 'Newsletter image'}"
             style="max-width:100%; width:auto; max-height:450px; height:auto; border-radius:10px;
                    display:inline-block; box-shadow: 0 4px 16px rgba(4,120,87,0.15); border: 1px solid #d1fae5;">
      </div>`;

    // Convert the final markdown to HTML using the enhanced renderer
    const htmlBody = marked(finalMarkdown, { renderer });

    // Generate the final email HTML with Twin Focus design system
    const emailHtml = juice(`
      <body style="background-color:#f9fafb; margin:0; padding:0; -webkit-text-size-adjust:100%; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
        <!-- Twin Focus print CSS for PDF generation -->
        <style>
          @media print {
            body, html { 
              width: 100%; 
              height: auto; 
              background-color: #ffffff !important; 
            }
            
            h1, h2, h3 { 
              page-break-after: avoid; 
              margin-top: 1.1em;
            }
            
            .image-container { 
              page-break-inside: avoid; 
            }
            
            table { 
              page-break-inside: auto; 
            }
            
            .content-container {
              page-break-inside: auto !important;
            }
          }
          
          /* Mobile-first responsive design */
          @media screen and (max-width: 600px) {
            body {
              background-color: #ffffff !important;
            }
            
            .content-wrapper {
              padding: 0 !important;
              background-color: #ffffff !important;
            }
            
            .content-container {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            
            .content-body {
              padding: 16px 12px !important;
              font-size: 16px !important;
              line-height: 1.6 !important;
            }
            
            /* Mobile-optimized headings */
            h1 {
              font-size: 26px !important;
              margin: 0 0 14px 0 !important;
              line-height: 1.3 !important;
            }
            
            h2 {
              font-size: 20px !important;
              margin: 20px 0 10px 0 !important;
              line-height: 1.4 !important;
            }
            
            h3 {
              font-size: 17px !important;
              margin: 16px 0 8px 0 !important;
              line-height: 1.4 !important;
            }
            
            /* Mobile table optimization */
            table {
              font-size: 14px !important;
            }
            
            td {
              padding: 8px 6px !important;
            }
            
            /* Mobile-optimized images */
            .image-container {
              margin: 14px 0 18px 0 !important;
              padding: 0 !important;
            }
            
            .image-container img {
              border-radius: 6px !important;
              box-shadow: 0 2px 8px rgba(4,120,87,0.1) !important;
              max-width: 100% !important;
            }
          }
          
          /* Tablet optimization */
          @media screen and (min-width: 601px) and (max-width: 900px) {
            .content-container {
              max-width: 95% !important;
              margin: 0 auto !important;
            }
            
            .content-body {
              padding: 30px 25px !important;
            }
          }
        </style>

        <!-- Twin Focus newsletter container -->
        <div class="content-wrapper" style="width: 100%; max-width: 100%; margin: 0 auto; text-align: center; background-color: #f9fafb; padding: 18px 0;">
         <div class="content-container" style="display: block; width: 100%; max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; box-shadow: 0 6px 24px rgba(4,120,87,0.1); text-align: left; border: 1px solid #d1fae5;">

            <div class="content-body" style="padding: 22px 18px; line-height: 1.7; color: #374151; font-size: 16px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">

              ${htmlBody}
            </div>
          </div>
          
          <div class="footer" style="text-align: center; padding: 30px 0 40px 0; font-size: 14px; color: #047857; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
            Powered by <strong>LetterNest</strong> Twin Focus<br>
            <span style="color: #6b7280; font-size: 12px;">Dual-Perspective Newsletter Generation</span>
          </div>
        </div>
      </body>
    `);

    logStep("Converted 'Twin Focus' markdown to HTML with dual-tone design system");

    // 17) Send email via Resend
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@newsletters.letternest.ai"; 
      const emailSubject = `Twin Focus: Your Dual-Perspective Insights from LetterNest`; 
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `LetterNest <${fromEmail}>`, to: profile.sending_email, subject: emailSubject, html: emailHtml, text: finalMarkdown 
      });
      if (emailError) { console.error("Error sending email with Resend:", emailError); throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`); }
      logStep("'Twin Focus' Email sent successfully", { id: emailData?.id });
    } catch (sendErr) { console.error("Error sending email:", sendErr); }

    // 18) Save the newsletter to newsletter_storage table
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({ user_id: userId, markdown_text: finalMarkdown });
      if (storageError) { console.error("Failed to save 'Twin Focus' newsletter to storage:", storageError); } 
      else { logStep("'Twin Focus' Newsletter successfully saved to storage"); }
    } catch (storageErr) { console.error("Error saving 'Twin Focus' newsletter to storage:", storageErr); }

    // 19) Update remaining generations count
    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase.from("profiles").update({ remaining_newsletter_generations: newCount }).eq("id", userId);
      if (updateError) { console.error("Failed to update remaining generations:", updateError); } 
      else { logStep("Updated remaining generations count", { newCount }); }
    }

    // 20) Final log & response
    const timestamp = new Date().toISOString();
    logStep("'Twin Focus' newsletter generation successful with dual-tone design", {
      userId, timestamp, tweetCount: selectedCount,
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0
    });
    return {
      status: "success",
      message: "'Twin Focus' newsletter generated and process initiated for email.",
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
      data: { analysisResult: finalAnalysisForMarkdown, markdownNewsletter: finalMarkdown, timestamp }
    };
  } catch (error) {
    console.error("Error in background 'Twin Focus' newsletter generation process:", error);
    return {
      status: "error",
      message: (error as Error).message || "Internal server error during 'Twin Focus' generation"
    };
  }
}

// Main serve function
serve(async (req: Request) => {
  if (req.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
  try {
    logStep("Starting 'Twin Focus' newsletter generation process (HTTP)");
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
      message: "Your 'Twin Focus' newsletter generation has started. You will receive an email when it's ready.",
    }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in twin-focus-newsletter-generation function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
