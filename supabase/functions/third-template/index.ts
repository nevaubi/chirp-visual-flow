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
  console.log(`[CREATIVE-TEMPLATE] ${step}${detailsStr}`);
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

    // 9) Call OpenAI for enhanced creative analysis with layout specifications
    logStep("Calling OpenAI for creative thematic analysis with varied layouts");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");
    
    const analysisSystemPrompt = `You are an expert content strategist and visual newsletter designer for LetterNest's "Creative Showcase" template. Your task is to analyze tweet collections and synthesize them into visually stunning, professionally laid out content with VARIED SECTION STRUCTURES.

CORE CAPABILITIES:
- Identify 4-5 main thematic clusters optimized for visual presentation
- Design content for SPECIFIC LAYOUT TYPES (see layout specifications below)
- Strategically assign different layouts to different themes for visual variety
- Select compelling imagery for each section
- Create engaging, readable content optimized for visual consumption

LAYOUT TYPE SPECIFICATIONS:
You MUST assign each main theme one of these specific layout types:

**LAYOUT A: IMAGE-LEFT + BULLETS-RIGHT**
- Large image on left side (portrait or square orientation preferred)
- 4-5 concise bullet points on right side
- Each bullet: 15-25 words max, action-oriented
- Perfect for: step-by-step insights, key takeaways, actionable advice

**LAYOUT B: HORIZONTAL WIDE BULLETS**
- Full-width section with no side images
- 4-6 comprehensive bullet points spanning full width
- Each bullet: 30-50 words, detailed explanations
- Perfect for: complex topics, detailed analysis, comprehensive insights

**LAYOUT C: DOUBLE COLUMN**
- Two equal columns of text content
- Left column: "The Situation" (context, background)
- Right column: "The Impact" (consequences, implications, analysis)
- Perfect for: cause-and-effect topics, comparative analysis, dual perspectives

**LAYOUT D: FEATURED HIGHLIGHT**
- Large featured image at top
- 2-3 substantial paragraphs below (100-150 words each)
- Perfect for: trending topics, major developments, spotlight features

**LAYOUT E: GRID INSIGHTS**
- 2x2 or 2x3 grid of insight boxes
- Each box: icon/emoji + title + 2-3 sentence description
- Perfect for: quick tips, multiple related points, trend summaries

OUTPUT STRUCTURE:
1. **HOOK:** 1-2 engaging sentences
2. **MAIN THEMES (4-5):** For each theme provide:
   - **Theme Title:** Creative, engaging (5-8 words)
   - **Assigned Layout:** Specify which layout type (A, B, C, D, or E)
   - **Primary Image URL:** Best representative image from tweets
   - **Content for Layout:** Formatted specifically for the assigned layout type
   - **Visual Notes:** Color suggestions, styling preferences

3. **QUICK BITES (2-3):** Short, punchy insights for sidebar content

CONTENT REQUIREMENTS:
- Engaging, accessible language (conversational but professional)
- Strong visual storytelling approach
- Strategic use of emojis and visual elements
- Each theme must use a DIFFERENT layout type for maximum visual variety
- Focus on scannability and visual appeal

CRITICAL: Ensure each main theme is assigned a different layout type (A through E) for maximum visual variety.

Tweet data to analyze:
${formattedTweets}`;
    
    const analysisUserPrompt = `Create content for the "Creative Showcase" newsletter template using the provided tweet collection. 

Requirements:
1. Generate a compelling HOOK (1-2 sentences)
2. Create 4-5 MAIN THEMES, each with:
   - Creative theme title
   - Assigned layout type (A, B, C, D, or E - each theme must use a different layout)
   - Primary image URL from the tweet data
   - Content formatted specifically for that layout type
   - Visual styling notes
3. Add 2-3 QUICK BITES for sidebar content

Focus on creating visually engaging, professionally laid out content that maximizes the impact of different section structures. Ensure each theme uses a different layout type for maximum visual variety.

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
        temperature: 0.6,
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
    logStep("Successfully generated creative thematic analysis with layout specifications");

    // 10) Topic Selection and Query Generation for Perplexity (simplified for creative template)
    logStep("Selecting topics for potential web enrichment");
    const queryGenerationPrompt = `You are selecting the most promising themes from a creative newsletter analysis for potential web enrichment. 

Review the analysis and select up to 2 themes that would benefit most from additional current web context. Focus on:
- Breaking news or trending topics
- Complex developments that need additional context
- Emerging trends worth exploring further

FORMAT:
===
THEME 1: [Theme Name]
QUERY: [25-40 character search query]
ENRICHMENT GOAL: [What specific info would enhance this]

THEME 2: [Theme Name] 
QUERY: [25-40 character search query]
ENRICHMENT GOAL: [What specific info would enhance this]
===

ANALYSIS TO REVIEW:
${analysisResult}`;

    const queryGenRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: "You are a search query optimization specialist for creative newsletters." },
          { role: "user", content: queryGenerationPrompt }
        ],
        temperature: 0.3, max_tokens: 1000
      })
    });

    let webEnrichmentContent: { themeName: string; webSummary: string; sources: any[] }[] | null = null;
    if (!queryGenRes.ok) {
      logStep("Failed to generate search queries, continuing without web enrichment");
    } else {
      const queryGenJson = await queryGenRes.json();
      const searchQueriesText = queryGenJson.choices[0].message.content.trim();
      logStep("Successfully generated search queries for creative template");

      const topicsToEnrich: { theme: string; query: string; goal: string }[] = [];
      const regex = /THEME \d+:\s*(.+?)\s*QUERY:\s*(.+?)\s*ENRICHMENT GOAL:\s*(.+?)(?=\n\s*THEME \d+:|$)/gis;
      let match;
      while ((match = regex.exec(searchQueriesText)) !== null) {
        topicsToEnrich.push({ theme: match[1].trim(), query: match[2].trim(), goal: match[3].trim() });
      }

      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      if (PERPLEXITY_API_KEY && topicsToEnrich.length > 0) {
        logStep("Making Perplexity API calls for creative template enrichment", { topicsCount: topicsToEnrich.length });
        const enrichmentResults = [];
        for (const topic of topicsToEnrich) {
          try {
            const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
              body: JSON.stringify({ 
                model: "sonar-pro", 
                messages: [{ role: "user", content: topic.query }], 
                temperature: 0.2, 
                max_tokens: 300,
                search_recency_filter: "week"
              })
            });
            if (perplexityRes.ok) {
              const data = await perplexityRes.json();
              enrichmentResults.push({ 
                themeName: topic.theme, 
                webSummary: data.choices[0].message.content, 
                sources: data.choices[0].message.citations ?? [] 
              });
              logStep(`Successfully enriched creative theme: ${topic.theme}`);
            } else {
              console.error(`Perplexity API error for "${topic.query}": ${perplexityRes.status}`);
            }
          } catch (err) {
            console.error(`Perplexity fetch failed for "${topic.query}":`, err);
          }
        }
        if (enrichmentResults.length > 0) { webEnrichmentContent = enrichmentResults; }
      }
    }

    // 12) Integrate Web Content if available
    let finalAnalysisForMarkdown = analysisResult;
    if (webEnrichmentContent && webEnrichmentContent.length > 0) {
      logStep("Integrating web content with creative analysis");
      const integrationPrompt = `You are enhancing a creative newsletter analysis with current web insights. 

RULES: 
- Maintain the original layout structure and assignments
- For themes with web enrichment, add a "Latest Context:" subsection with 2-3 current insights
- Keep the creative, visual approach while adding valuable context
- Ensure layout specifications remain intact

ORIGINAL ANALYSIS:
${analysisResult}

WEB ENRICHMENT:
${JSON.stringify(webEnrichmentContent, null, 2)}

Provide the complete, enhanced analysis maintaining all layout structures.`;

      const integrationRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4.1-2025-04-14",
          messages: [
            { role: "system", content: "You are enhancing creative content with current web insights while maintaining visual structure." },
            { role: "user", content: integrationPrompt }
          ],
          temperature: 0.3, max_tokens: 12000
        })
      });

      if (integrationRes.ok) {
        const integrationJson = await integrationRes.json();
        finalAnalysisForMarkdown = integrationJson.choices[0].message.content.trim();
        logStep("Successfully integrated web content with creative analysis");
      } else {
        logStep("Failed to integrate web content, continuing with original analysis");
      }
    }

    // 13) Generate Enhanced Markdown with Creative Layout Implementation
    let markdownNewsletter = "";
    try {
      logStep("Starting 'Creative Showcase' markdown newsletter formatting with varied layouts");
      const markdownSystemPrompt = `You are a professional newsletter designer for "Creative Showcase" by LetterNest. Transform the analyzed content into a beautifully formatted, visually diverse Markdown newsletter that implements the specified layout types.

NEWSLETTER STRUCTURE:
1. **HEADER**: 
   - Newsletter title with creative styling
   - Date and edition number
   - Brief intro hook

2. **MAIN CONTENT SECTIONS**: 
   For each theme, implement the assigned layout type using markdown and HTML:

   **LAYOUT A (Image-Left + Bullets-Right)**: Use flexbox structure
   **LAYOUT B (Horizontal Wide Bullets)**: Full-width bullet sections
   **LAYOUT C (Double Column)**: Two-column responsive layout
   **LAYOUT D (Featured Highlight)**: Hero image + detailed content
   **LAYOUT E (Grid Insights)**: CSS Grid implementation

3. **SIDEBAR CONTENT**: Quick Bites section
4. **FOOTER**: Professional closing

LAYOUT IMPLEMENTATION GUIDELINES:

**For Layout A (Image-Left + Bullets-Right)**:
Use flexbox structure with image on left, bullets on right

**For Layout B (Horizontal Wide Bullets)**:
Full-width sections with comprehensive bullet points

**For Layout C (Double Column)**:
Two-column layout with contrasting content sections

**For Layout D (Featured Highlight)**:
Hero image with detailed content sections below

**For Layout E (Grid Insights)**:
Grid-based layout with organized insight boxes

LAYOUT IMPLEMENTATION EXAMPLES:
- Layout A: Image on left (40% width) with numbered bullets on right
- Layout B: Full-width colored background with card-style bullets
- Layout C: Side-by-side columns with different colored backgrounds
- Layout D: Large featured image with content below in card format
- Layout E: CSS Grid with insight boxes containing icons and content

STYLING REQUIREMENTS:
- Use modern color palette: Primary blues (#1e293b, #3b82f6), accent colors (#6366f1, #8b5cf6), warm highlights (#f59e0b, #ef4444)
- Implement responsive design considerations
- Add proper spacing and visual hierarchy
- Use professional typography with proper font weights
- Include subtle shadows and modern border-radius values
- Ensure mobile-friendly responsive behavior

OUTPUT: Provide ONLY the complete formatted Markdown newsletter with embedded HTML for layouts. Make it visually stunning and professionally laid out.`;
      
      const markdownUserPrompt = `Transform this creative newsletter analysis into a beautifully formatted "Creative Showcase" newsletter. Implement each layout type exactly as specified in the analysis.

Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

ANALYSIS WITH LAYOUT SPECIFICATIONS:
${finalAnalysisForMarkdown}

Create a visually stunning newsletter that properly implements each layout type (A, B, C, D, E) as assigned to the themes. Focus on professional presentation and visual appeal.`;
      
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
            temperature: 0.2, max_tokens: 12000
          })
        });
        if (markdownOpenaiRes.ok) {
          const markdownJson = await markdownOpenaiRes.json();
          markdownNewsletter = markdownJson.choices[0].message.content;
          logStep("'Creative Showcase' Markdown with varied layouts generated successfully");
        } else {
          const errorText = await markdownOpenaiRes.text();
          console.error(`Markdown formatting OpenAI error (${markdownOpenaiRes.status}):`, errorText);
          markdownNewsletter = `Error: Unable to generate markdown. Analysis:\n${finalAnalysisForMarkdown}`;
        }
      } catch (markdownError) {
        console.error("Error in creative markdown formatting API call:", markdownError);
        markdownNewsletter = `Error: API error in markdown. Analysis:\n${finalAnalysisForMarkdown}`;
      }
    } catch (err) {
      console.error("Error generating Creative Showcase Markdown newsletter:", err);
      markdownNewsletter = `Error: Failed to generate markdown. Analysis:\n${finalAnalysisForMarkdown}`;
    }

    // 14) Enhanced UI/UX Polish with Professional Creative Styling
    let enhancedMarkdownNewsletter = markdownNewsletter;
    try {
      logStep("Generating enhanced UI/UX markdown with creative professional styling");
      const enhancedSystemPrompt = `
You are a newsletter design specialist focused on creating visually stunning, professional newsletters. Transform the "Creative Showcase" markdown into a polished, publication-ready format with enhanced visual elements.

ENHANCED STYLING REQUIREMENTS:

**PROFESSIONAL COLOR PALETTE:**
- Primary: #1a202c (charcoal) for main text
- Secondary: #2d3748 (dark gray) for headings  
- Accent Blue: #3182ce (professional blue)
- Accent Purple: #805ad5 (creative purple)
- Accent Teal: #319795 (modern teal)
- Success: #38a169 (forest green)
- Warning: #d69e2e (golden yellow)
- Background tints: #f7fafc, #edf2f7, #e2e8f0

**ENHANCED LAYOUT IMPLEMENTATIONS:**

1. **Typography Enhancement**: 
   - Add Google Fonts integration: 'Inter' for body, 'Poppins' for headings
   - Implement proper font weights and line-heights
   - Add letter-spacing for headings

2. **Interactive Elements**:
   - Add hover effects on cards and buttons
   - Implement subtle animations and transitions
   - Add visual feedback elements

3. **Advanced Grid Systems**:
   - Implement CSS Grid with named grid lines
   - Add responsive breakpoints
   - Create dynamic spacing systems

4. **Visual Enhancements**:
   - Add gradient backgrounds and overlays
   - Implement modern card designs with elevated shadows
   - Add icon integration and visual separators
   - Include progress bars, badges, and visual indicators

5. **Mobile-First Responsive Design**:
   - Implement proper mobile stacking
   - Add touch-friendly interactive elements
   - Ensure readability on all devices

SPECIFIC IMPROVEMENTS:
- Transform basic layouts into sophisticated, visually appealing sections
- Add micro-interactions and visual polish
- Implement professional spacing and typography scales
- Add visual hierarchy through color, size, and positioning
- Include subtle branding elements and visual consistency

OUTPUT: Provide the enhanced, publication-ready newsletter markdown with sophisticated styling and professional visual design.
`;
      
      const enhancedUserPrompt = `
Transform this "Creative Showcase" newsletter into a sophisticated, visually stunning publication ready for professional distribution.

Focus on:
- Professional typography and spacing
- Modern color schemes and visual hierarchy
- Responsive design implementation
- Subtle animations and interactive elements
- Publication-quality visual polish

Current Newsletter Draft:
<newsletter>
${markdownNewsletter}
</newsletter>
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
            temperature: 0.1, max_tokens: 15000
          })
        });
        if (enhancedOpenaiRes.ok) {
          const enhancedJson = await enhancedOpenaiRes.json();
          enhancedMarkdownNewsletter = enhancedJson.choices[0].message.content;
          logStep("Enhanced Creative Showcase newsletter with professional styling generated");
        } else {
          const errorText = await enhancedOpenaiRes.text();
          console.error(`Enhanced Creative styling OpenAI error (${enhancedOpenaiRes.status}):`, errorText);
        }
      } catch (enhancedError) {
        console.error("Error in enhanced creative styling API call:", enhancedError);
      }
    } catch (err) {
      console.error("Error generating Enhanced Creative Showcase newsletter:", err);
    }

    // 15) Clean up markdown
    function cleanMarkdown(md: string): string {
      let cleaned = md.replace(/^```(?:markdown|html)?\s*([\s\S]*?)\s*```$/i, '$1');
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
    logStep("Cleaned up final creative showcase markdown");

    // 16) Convert to HTML with enhanced creative renderer
    const renderer = new marked.Renderer();
    
    // Professional paragraph rendering
    renderer.paragraph = (text) => {
        if (text.trim().startsWith('<div') || text.trim().startsWith('<section')) {
            return text.trim() + '\n';
        }
        return `<p style="margin: 0 0 1.5em 0; line-height: 1.7; font-size: 16px; color: #1a202c; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${text}</p>\n`;
    };

    // Enhanced list rendering
    renderer.listitem = (text, task, checked) => {
      if (task) {
        return `<li class="task-list-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled> ${text}</li>\n`;
      }
      return `<li style="margin: 0 0 1em 0; font-size: 16px; line-height: 1.7; color: #1a202c; font-family: 'Inter', sans-serif;">${text}</li>\n`;
    };

    // Creative heading renderer with modern typography
    renderer.heading = (text, level) => {
      const colors = {
        1: '#1a202c',
        2: '#2d3748', 
        3: '#3182ce',
        4: '#805ad5',
        5: '#319795',
        6: '#38a169'
      };
      const sizes = {
        1: '36px',
        2: '28px',
        3: '24px',
        4: '20px',
        5: '18px',
        6: '16px'
      };
      const weights = {
        1: '800',
        2: '700',
        3: '600',
        4: '600',
        5: '500',
        6: '500'
      };
      
      const color = colors[level as keyof typeof colors] || '#1a202c';
      const size = sizes[level as keyof typeof sizes] || '18px';
      const weight = weights[level as keyof typeof weights] || '500';
      
      return `<h${level} style="color:${color};
                               font-size:${size};
                               margin:2em 0 1em;
                               font-weight:${weight};
                               font-family: 'Poppins', 'Inter', sans-serif;
                               letter-spacing: -0.025em;">${text}</h${level}>\n`;
    };

    // Enhanced image renderer with creative styling
    renderer.image = (href, _title, alt) => `
      <div class="image-container" style="text-align:center; margin: 30px 0 40px; padding: 0;">
        <img src="${href}"
             alt="${alt || 'Newsletter image'}"
             style="max-width:100%; width:auto; max-height:600px; height:auto; border-radius:16px;
                    display:inline-block; box-shadow: 0 10px 30px rgba(26,32,44,0.1), 0 4px 8px rgba(45,55,72,0.05); 
                    border: 1px solid #e2e8f0; transition: transform 0.3s ease;"
             onmouseover="this.style.transform='scale(1.02)'"
             onmouseout="this.style.transform='scale(1)'">
      </div>`;

    const htmlBody = marked(finalMarkdown, { renderer });

    // Generate the final email HTML with creative design system
    const emailHtml = juice(`
      <body style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 50%, #e2e8f0 100%); margin:0; padding:0; -webkit-text-size-adjust:100%; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <!-- Creative design CSS -->
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');
          
          @media print {
            body, html { 
              width: 100%; 
              height: auto; 
              background: #ffffff !important; 
            }
            
            h1, h2, h3 { 
              page-break-after: avoid; 
              margin-top: 1.5em;
            }
            
            .image-container { 
              page-break-inside: avoid; 
            }
            
            p, ul, ol, dl, blockquote { 
              page-break-inside: auto; 
            }
          }
          
          /* Mobile-first responsive design */
          @media screen and (max-width: 600px) {
            body {
              background: #ffffff !important;
            }
            
            .content-wrapper {
              padding: 0 !important;
              background: #ffffff !important;
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
              padding: 20px 15px !important;
            }
            
            /* Mobile-optimized headings */
            h1 {
              font-size: 30px !important;
              margin: 0 0 20px 0 !important;
              line-height: 1.3 !important;
            }
            
            h2 {
              font-size: 24px !important;
              margin: 30px 0 15px 0 !important;
              line-height: 1.4 !important;
            }
            
            h3 {
              font-size: 20px !important;
              margin: 25px 0 12px 0 !important;
              line-height: 1.4 !important;
            }
            
            /* Mobile layout adjustments */
            div[style*="display: flex"] {
              flex-direction: column !important;
            }
            
            div[style*="display: grid"] {
              grid-template-columns: 1fr !important;
              gap: 15px !important;
            }
            
            div[style*="flex: 0 0 40%"] {
              flex: none !important;
              max-width: 100% !important;
              margin-bottom: 20px !important;
            }
            
            /* Mobile image optimization */
            .image-container {
              margin: 20px 0 25px 0 !important;
            }
            
            .image-container img {
              border-radius: 8px !important;
              max-height: 300px !important;
            }
          }
          
          /* Tablet optimization */
          @media screen and (min-width: 601px) and (max-width: 900px) {
            .content-container {
              max-width: 95% !important;
              margin: 10px auto !important;
            }
            
            .content-body {
              padding: 40px 35px !important;
            }
          }
          
          /* Enhanced typography and spacing */
          .content-body h1, .content-body h2, .content-body h3 {
            font-family: 'Poppins', 'Inter', sans-serif;
          }
          
          .content-body p, .content-body li {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          
          /* Custom hover effects for interactive elements */
          .hover-card {
            transition: all 0.3s ease;
          }
          
          .hover-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 35px rgba(26,32,44,0.15) !important;
          }
        </style>

        <!-- Creative newsletter container -->
        <div class="content-wrapper" style="width: 100%; max-width: 100%; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 50%, #e2e8f0 100%); padding: 25px 0;">
         <div class="content-container" style="display: block; width: 100%; max-width: 750px; margin: 0 auto; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 50px rgba(26,32,44,0.15), 0 8px 16px rgba(45,55,72,0.1); text-align: left; border: 1px solid #e2e8f0; overflow: hidden;">

            <div class="content-body" style="padding: 30px 20px; line-height: 1.7; color: #1a202c; font-size: 16px; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">

              ${htmlBody}
            </div>
          </div>
          
          <div class="footer" style="text-align: center; padding: 40px 0 50px 0; font-size: 14px; color: #3182ce; font-family: 'Inter', sans-serif;">
            <div style="background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-radius: 12px; padding: 20px; margin: 0 20px; box-shadow: 0 4px 12px rgba(26,32,44,0.08);">
              Powered by <strong style="color: #1a202c;">LetterNest</strong><br>
              <span style="color: #718096; font-size: 12px;">Creative Newsletter Generation</span>
            </div>
          </div>
        </div>
      </body>
    `);

    logStep("Converted Creative Showcase newsletter to HTML with professional creative design");

    // 17) Send email via Resend
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@newsletters.letternest.ai"; 
      const emailSubject = `Creative Showcase: Your Visual Newsletter from LetterNest`; 
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `LetterNest Creative <${fromEmail}>`, 
        to: profile.sending_email, 
        subject: emailSubject, 
        html: emailHtml, 
        text: finalMarkdown 
      });
      if (emailError) { 
        console.error("Error sending Creative Showcase email with Resend:", emailError); 
        throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`); 
      }
      logStep("Creative Showcase email sent successfully", { id: emailData?.id });
    } catch (sendErr) { 
      console.error("Error sending Creative Showcase email:", sendErr); 
    }

    // 18) Save newsletter to storage
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({ 
        user_id: userId, 
        markdown_text: finalMarkdown 
      });
      if (storageError) { 
        console.error("Failed to save Creative Showcase newsletter to storage:", storageError); 
      } else { 
        logStep("Creative Showcase newsletter successfully saved to storage"); 
      }
    } catch (storageErr) { 
      console.error("Error saving Creative Showcase newsletter to storage:", storageErr); 
    }

    // 19) Update remaining generations count
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

    // 20) Final response
    const timestamp = new Date().toISOString();
    logStep("Creative Showcase newsletter generation successful", {
      userId, timestamp, tweetCount: selectedCount,
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0
    });
    
    return {
      status: "success",
      message: "Creative Showcase newsletter generated and emailed successfully",
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
      data: { analysisResult: finalAnalysisForMarkdown, markdownNewsletter: finalMarkdown, timestamp }
    };
  } catch (error) {
    console.error("Error in Creative Showcase newsletter generation process:", error);
    return {
      status: "error",
      message: (error as Error).message || "Internal server error during Creative Showcase generation"
    };
  }
}

// Main serve function
serve(async (req: Request) => {
  if (req.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
  try {
    logStep("Starting Creative Showcase newsletter generation process");
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
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) { 
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      backgroundTask.then(result => { logStep("Background task completed", result); })
      .catch(err => { console.error("Background task error:", err); });
    }
    return new Response(JSON.stringify({
      status: "processing",
      message: "Your Creative Showcase newsletter generation has started. You will receive an email when it's ready.",
    }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in Creative Showcase newsletter generation function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
