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
  console.log(`[NEWSLETTER-GEN] ${step}${detailsStr}`);
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

    // 4) Subscription & plan & tokens checks (No changes here)
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

    // 5) Ensure numerical_id (No changes here)
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

    // 6) Fetch bookmarks (No changes here)
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

    // 7) Fetch detailed tweets via Apify (No changes here)
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

    // 8) Format tweets for OpenAI (No changes here)
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

    // 9) Call OpenAI for main analysis (MODIFIED FOR VARIED STRUCTURE, MORE COLOR INFO)
    logStep("Calling OpenAI for initial thematic analysis and hook generation");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");
    
    const analysisSystemPrompt = `You are an expert content strategist and analyst for LetterNest. Your task is to analyze a collection of tweets and synthesize them into substantial, insightful, and structurally varied themes for the "Chain of Thought" newsletter. This includes crafting an engaging hook and proactively identifying relevant imagery.

CAPABILITIES:
- Identify 4-5 main thematic clusters.
- For each theme, synthesize core ideas into detailed explanations, incorporating varied text structures.
- Identify 3-4 secondary themes (sidetracks) with comprehensive summaries.
- Generate a compelling 1-2 sentence "hook".
- For EACH main theme and EACH noteworthy sidetrack, actively select a highly relevant PhotoUrl.

OUTPUT STRUCTURE:
1.  **HOOK:** A 1-2 sentence engaging teaser.
2.  **MAIN THEMES (4-5 identified):**
    *   **Theme Title:** Concise, engaging.
    *   **The Gist:** 3-4 sentence summary.
    *   **Key Insights:** 4-5 bullet points (50-70 words each).
    *   **Deeper Dive (Varied Structure):** A substantial section (approx. 300-450 words). Within this, incorporate:
        *   Standard paragraphs for explanation.
        *   **Where appropriate for clarity or emphasis, use a numbered list for sequential points or a short series of related ideas.**
        *   **Include one "Key Takeaway Box":** A distinct, brief (1-2 sentences) summary of the most crucial point from the Deeper Dive, labeled clearly (e.g., "KEY TAKEAWAY: ...").
        *   **Optionally, a "Synthesized Quote":** If a powerful, synthesized statement (NOT a direct tweet quote) can encapsulate a core aspect of the theme, include it, labeled "THEME SNAPSHOT: '...'".
    *   **RepresentativeImageURL (Strive to include):** The most compelling image. If none, state "N/A".
3.  **NOTEWORTHY SIDETRACKS (3-4 identified):**
    *   **Sidetrack Title:** Brief, descriptive.
    *   **Quick Take:** 2-3 sentence summary.
    *   **RepresentativeImageURL (Strive to include):** Relevant image. If none, "N/A".

CRITICAL INSTRUCTIONS:
- NO direct tweet quotes, IDs, or authors.
- Focus on comprehensive synthesis, abstraction, and thematic storytelling with varied presentation.
- Tone: Professional, insightful, accessible.
- Actively seek and include 'RepresentativeImageURL' for all themes/sidetracks.

Tweet data to analyze:
${formattedTweets}`;
    
    const analysisUserPrompt = `Based on the tweet collection, generate content for the "Chain of Thought" newsletter:
1.  HOOK (1-2 sentences).
2.  4-5 MAIN THEMES, each with:
    *   Theme Title.
    *   "The Gist" (3-4 sentences).
    *   4-5 "Key Insights" (bullet points, 50-70 words each).
    *   "Deeper Dive" (300-450 words) incorporating paragraphs, and where logical, a numbered list and one "KEY TAKEAWAY BOX". Optionally, a "THEME SNAPSHOT" synthesized quote.
    *   'RepresentativeImageURL' (or "N/A").
3.  3-4 NOTEWORTHY SIDETRACKS, each with:
    *   Sidetrack Title.
    *   "Quick Take" (2-3 sentences).
    *   'RepresentativeImageURL' (or "N/A").

Ensure substantial, insightful content with varied text structures and proactive image inclusion.

Tweet collection:
${formattedTweets}`;
    
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: analysisSystemPrompt },
          { role: "user", content: analysisUserPrompt }
        ],
        temperature: 0.5,
        max_tokens: 4090 
      })
    });
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(`OpenAI API error (${openaiRes.status}):`, txt);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    const openaiJson = await openaiRes.json();
    let analysisResult = openaiJson.choices[0].message.content.trim();
    logStep("Successfully generated initial thematic analysis (varied structure, image focus)");

    // 10) Topic Selection and Query Generation for Perplexity (No changes needed here)
    logStep("Selecting topics and generating search queries for Perplexity");
    const queryGenerationPrompt = `You are an expert at identifying promising themes for web search enrichment. Given a thematic analysis, select up to 3 themes that would benefit most from additional web-based context.
TASK: Review analysis, select up to 3 themes (relevance, complexity, value). For each: search query (25-50 chars), enrichment goal.
FORMAT:
===
THEME 1: [Theme Name]
QUERY: [Search Query]
ENRICHMENT GOAL: [Goal]
... (up to 3)
===
THEMATIC ANALYSIS:
${analysisResult}`;

    const queryGenRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o", 
        messages: [
          { role: "system", content: "You are a search query optimization specialist." },
          { role: "user", content: queryGenerationPrompt }
        ],
        temperature: 0.3, max_tokens: 800
      })
    });
    let webEnrichmentContent: { themeName: string; webSummary: string; sources: any[] }[] | null = null;
    if (!queryGenRes.ok) {
      const txt = await queryGenRes.text();
      console.error(`OpenAI query generation error (${queryGenRes.status}):`, txt);
      logStep("Failed to generate search queries, continuing without Perplexity enrichment");
    } else {
      const queryGenJson = await queryGenRes.json();
      const searchQueriesText = queryGenJson.choices[0].message.content.trim();
      logStep("Successfully generated search queries", { searchQueriesText });
      const topicsToEnrich: { theme: string; query: string; goal: string }[] = [];
      const regex = /THEME \d+:\s*(.+?)\s*QUERY:\s*(.+?)\s*ENRICHMENT GOAL:\s*(.+?)(?=\n\s*THEME \d+:|$)/gis;
      let match;
      while ((match = regex.exec(searchQueriesText)) !== null) {
        topicsToEnrich.push({ theme: match[1].trim(), query: match[2].trim(), goal: match[3].trim() });
      }
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      if (!PERPLEXITY_API_KEY || topicsToEnrich.length === 0) {
        logStep("Missing Perplexity API key or no topics to enrich, continuing without web enrichment");
      } else {
        logStep("Making Perplexity API calls for web enrichment", { topicsCount: topicsToEnrich.length });
        const enrichmentResults = [];
        for (const topic of topicsToEnrich) {
          try {
            const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
                body: JSON.stringify({ model: "sonar-pro", messages: [{ role: "user", content: topic.query }], temperature: 0.2, max_tokens: 400 })
            });
            if (perplexityRes.ok) {
              const data = await perplexityRes.json();
              enrichmentResults.push({ themeName: topic.theme, webSummary: data.choices[0].message.content, sources: data.choices[0].message.citations ?? [] });
              logStep(`Successfully enriched theme: ${topic.theme}`);
            } else {
              console.error(`Perplexity API error for "${topic.query}": ${perplexityRes.status}`, await perplexityRes.text());
              enrichmentResults.push({ themeName: topic.theme, webSummary: `[Perplexity error ${perplexityRes.status}]`, sources: [] });
            }
          } catch (err) {
            console.error(`Perplexity fetch failed for "${topic.query}":`, err);
            enrichmentResults.push({ themeName: topic.theme, webSummary: "[Perplexity request failed]", sources: [] });
          }
        }
        if (enrichmentResults.length > 0) { webEnrichmentContent = enrichmentResults; logStep("Web enrichment data collected"); }
      }
    }

    // 12) Integrate Web Content (No changes needed here other than accommodating potentially longer base analysis)
    let finalAnalysisForMarkdown = analysisResult; 
    if (webEnrichmentContent && webEnrichmentContent.length > 0) {
        logStep("Integrating web content with original thematic analysis");
        const integrationPrompt = `You are an expert content editor. Integrate web-sourced insights into the provided thematic analysis.
RULES: Maintain original structure. For themes with web enrichment, weave 3-4+ points from 'webSummary' into 'Deeper Dive', under "Broader Context Online:" (make this substantial, 100-150 words if possible). Mention sources concisely. Ensure smooth flow.
ORIGINAL ANALYSIS:
${analysisResult}
WEB-SOURCED INFO:
${JSON.stringify(webEnrichmentContent, null, 2)}
Provide complete, integrated analysis.`;
        const integrationRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are an expert content editor, skilled at seamlessly integrating supplementary information to create richer, more detailed texts." },
                    { role: "user", content: integrationPrompt }
                ],
                temperature: 0.3, max_tokens: 4090 
            })
        });
        if (integrationRes.ok) {
            const integrationJson = await integrationRes.json();
            finalAnalysisForMarkdown = integrationJson.choices[0].message.content.trim();
            logStep("Successfully integrated web content with thematic analysis");
        } else {
            const txt = await integrationRes.text();
            console.error(`OpenAI integration error (${integrationRes.status}):`, txt);
            logStep("Failed to integrate web content, continuing with original thematic analysis");
        }
    }

    // 13) Generate Markdown formatted newsletter (MODIFIED FOR VARIED STRUCTURE)
    let markdownNewsletter = "";
    try {
      logStep("Starting 'Chain of Thought' markdown newsletter formatting (varied structure)");
      const markdownSystemPrompt = `You are a professional newsletter editor for "Chain of Thought" by LetterNest. Format pre-analyzed thematic content (hook, main themes with varied structures like numbered lists/key takeaway boxes/synthesized quotes, sidetracks, image URLs) into a beautiful, professional Markdown newsletter.

NEWSLETTER STRUCTURE:
1.  HEADER: Title (H1 "Chain of Thought"), Date (H3/Subtitle), Subtle horizontal rule.
2.  INTRODUCTION: The "HOOK".
3.  MAIN THEMATIC SECTIONS: For each main theme:
    *   Section Title (H2).
    *   "The Gist" (Blockquoted/emphasized).
    *   Image: If 'RepresentativeImageURL' is valid, include it after "The Gist".
    *   "Key Insights" (Bulleted list).
    *   "Deeper Dive": Present the detailed explanation.
        *   If the analysis includes a numbered list, format it as such.
        *   If it includes a "KEY TAKEAWAY BOX:", format this distinctly (e.g., using a blockquote or a styled div precursor that will be enhanced later). Example: "> **KEY TAKEAWAY:** [text]".
        *   If it includes a "THEME SNAPSHOT:", format this distinctly. Example: "_THEME SNAPSHOT: \"[text]\"_".
    *   Subtle horizontal rule or extra spacing before next theme.
4.  NOTEWORTHY SIDETRACKS: Section Title (H2). For each sidetrack:
    *   Sub-section Title (H3).
    *   Image: If 'RepresentativeImageURL' is valid, include it.
    *   "Quick Take".
5.  FOOTER: Clear horizontal rule, "Generated by LetterNest."

FORMATTING GUIDELINES:
- Clean Markdown. Generous white space. Professional, insightful, engaging tone.
- Image Usage: Include 'RepresentativeImageURL' where valid. Aim for 3-5 well-placed images.
- Varied Structures: Correctly format numbered lists, "KEY TAKEAWAY BOX", and "THEME SNAPSHOT" if present in the input analysis.
- Do not invent content. Only format.

OUTPUT: ONLY the formatted Markdown content.`;
      
      const markdownUserPrompt = `Format this thematic analysis (with varied structures) into the "Chain of Thought" Markdown newsletter. Prioritize including images and correctly formatting special text structures.
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
THEMATIC ANALYSIS CONTENT:
${finalAnalysisForMarkdown}`;
      
      try {
        const markdownOpenaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: markdownSystemPrompt },
              { role: "user", content: markdownUserPrompt }
            ],
            temperature: 0.2, max_tokens: 4090
          })
        });
        if (markdownOpenaiRes.ok) {
          const markdownJson = await markdownOpenaiRes.json();
          markdownNewsletter = markdownJson.choices[0].message.content;
          logStep("'Chain of Thought' Markdown (varied structure) generated successfully");
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

    // 14) Generate Enhanced Markdown with UI/UX (UPDATED WITH NEW PROFESSIONAL COLOR SCHEME)
    let enhancedMarkdownNewsletter = markdownNewsletter;
    try {
      logStep("Generating enhanced UI/UX markdown with professional color scheme");
      const enhancedSystemPrompt = `
You are a newsletter UI/UX specialist. Your goal is to take "Chain of Thought" markdown (which may include specific structures like "KEY TAKEAWAY BOX:" or "THEME SNAPSHOT:") and output a **visually enhanced** markdown document using inline HTML/CSS with a sophisticated professional color palette.

PROFESSIONAL COLOR PALETTE & STYLING:
- **Primary Navy (Main Headings & Key Text):** #142a4b (Use for H1, H2, primary text emphasis)
- **Accent Blue (Secondary Headings):** #5774cd (Use for H3, link color, subtle accents)
- **Success Green (Highlights & Actions):** #a1c181 (Use for "THEME SNAPSHOT" text color, key callout borders)
- **Professional Background (Section Backgrounds):** #d2ddec (Use for "The Gist" backgrounds and major section separators)
- **Clean White:** #ffffff (For content backgrounds and contrast)
- **Subtle Border:** #D2DDEC (For dividers and light borders)
- **Body Text:** #333333 (Standard readable text)
- **Font:** "Lato, Tahoma, Verdana, Segoe, sans-serif" (Professional, clean typeface)

ENHANCEMENT RULES:
1.  **Headings with Professional Hierarchy:**
    *   H1: \`<h1 style="color: #142a4b; margin-bottom: 8px; font-weight: 700; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;">Chain of Thought</h1>\`
    *   H2: Wrap content in \`<span style="color: #142a4b; font-weight: 600; font-size: 24px;">\`.
    *   H3: Wrap content in \`<span style="color: #5774cd; font-weight: 500; font-size: 20px;">\`.

2.  **Professional Layout & Spacing:**
    *   Paragraphs: Add \`style="margin-bottom: 1.3em; line-height: 1.8; color: #333333; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;"\` for optimal readability.
    *   "The Gist" / Major Blockquotes: Wrap in \`<div style="background-color: #d2ddec; padding: 20px 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #142a4b; font-style: italic; color: #142a4b;">\`.

3.  **Enhanced Special Structures:**
    *   **KEY TAKEAWAY BOX**: Transform "> **KEY TAKEAWAY:**" into:
        \`<div style="background-color: #ffffff; padding: 18px 22px; border-radius: 8px; margin: 25px 0; border: 2px solid #a1c181; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"><strong style="color: #142a4b;">KEY TAKEAWAY:</strong> <span style="color: #333333;">[rest of text]</span></div>\`
    *   **THEME SNAPSHOT**: Transform "_THEME SNAPSHOT: \"[text]\"_" into:
        \`<div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;"><span style="color: #a1c181; font-weight: 500; font-size: 18px; border-bottom: 2px dotted #a1c181; padding-bottom: 3px;">THEME SNAPSHOT</span><p style="margin: 15px 0 0 0; font-style: italic; color: #142a4b; font-size: 16px;">"[text]"</p></div>\`

4.  **Professional List Styling:**
    *   Bulleted lists (\`<ul>\`) items: \`<li style="color: #5774cd; margin-bottom: 10px; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;"><span style="color: #333333;">[list item text]</span></li>\` (Accent bullet color, readable content)
    *   Numbered lists: Similar professional styling with structured hierarchy.

5.  **Section Dividers & Spacing:**
    *   Replace markdown '---' or add strategic dividers with:
        \`<div style="height: 2px; background: linear-gradient(to right, #d2ddec, #5774cd, #d2ddec); margin: 40px 0; border-radius: 1px;"></div>\`
    *   Add breathing room between major sections.

6.  **Email-Client Compatibility:** Ensure all styling uses inline CSS compatible with major email clients.

Transform the markdown below into a visually enhanced, professionally styled newsletter.
`;
      
      const enhancedUserPrompt = `
Transform the "Chain of Thought" markdown below into a **professionally enhanced** version using the sophisticated color palette and styling rules. Pay special attention to:
- Professional hierarchy with the navy/blue color scheme
- Enhanced styling for "KEY TAKEAWAY BOX:" and "THEME SNAPSHOT:" elements
- Improved spacing and typography for excellent readability
- Section dividers that create visual flow

"Chain of Thought" Markdown Draft:
<current newsletter>
${markdownNewsletter}
</current newsletter>
`;
      
      try {
        const enhancedOpenaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o", 
            messages: [
              { role: "system", content: enhancedSystemPrompt },
              { role: "user", content: enhancedUserPrompt }
            ],
            temperature: 0.1, // Very low temp for precise styling application
            max_tokens: 4090 
          })
        });
        if (enhancedOpenaiRes.ok) {
          const enhancedJson = await enhancedOpenaiRes.json();
          enhancedMarkdownNewsletter = enhancedJson.choices[0].message.content;
          logStep("Enhanced UI/UX markdown with professional color scheme generated");
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

    // 15) Clean up stray text around enhanced Markdown (No changes needed here)
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
    logStep("Cleaned up final markdown for 'Chain of Thought'");

    // 16) Convert final Markdown to HTML & inline CSS (UPDATED RENDERER WITH PROFESSIONAL STYLING)
    const renderer = new marked.Renderer();
    
    // Override paragraph rendering with professional styling
    renderer.paragraph = (text) => {
        if (text.trim().startsWith('<div style="height: 2px;') || text.trim().startsWith('<div style="background-color:')) {
            return text.trim() + '\n';
        }
        return `<p style="margin: 0 0 1.4em 0; line-height: 1.8; font-size: 16px; color: #333333; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;">${text}</p>\n`;
    };

    // Professional list item rendering
    renderer.listitem = (text, task, checked) => {
      if (task) {
        return `<li class="task-list-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled> ${text}</li>\n`;
      }
      return `<li style="margin: 0 0 0.9em 0; font-size: 16px; line-height: 1.7; color: #5774cd; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;"><span style="color: #333333;">${text}</span></li>\n`;
    };

    // Professional heading renderer with enhanced typography
    renderer.heading = (text, level) => {
      const colors = {
        1: '#142a4b',
        2: '#142a4b', 
        3: '#5774cd'
      };
      const sizes = {
        1: '32px',
        2: '26px',
        3: '22px'
      };
      const weights = {
        1: '700',
        2: '600',
        3: '500'
      };
      
      const color = colors[level as keyof typeof colors] || '#142a4b';
      const size = sizes[level as keyof typeof sizes] || '18px';
      const weight = weights[level as keyof typeof weights] || '500';
      
      const sectionClass = level === 2 ? ' class="section-heading"' : '';
      
      return `<h${level}${sectionClass} style="color:${color};
                               font-size:${size};
                               margin:1.5em 0 0.8em;
                               font-weight:${weight};
                               font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;">${text}</h${level}>\n`;
    };

    // Enhanced image renderer with professional container styling
    renderer.image = (href, _title, alt) => `
      <div class="image-container" style="text-align:center; margin: 25px 0 35px; padding: 0;">
        <img src="${href}"
             alt="${alt || 'Newsletter image'}"
             style="max-width:100%; width:auto; max-height:500px; height:auto; border-radius:12px;
                    display:inline-block; box-shadow: 0 6px 20px rgba(20,42,75,0.15); border: 1px solid #d2ddec;">
      </div>`;

    // Convert the final markdown to HTML using the enhanced renderer
    const htmlBody = marked(finalMarkdown, { renderer });

    // Generate the final email HTML with professional design system
    const emailHtml = juice(`
      <body style="background-color:#f5f7fa; margin:0; padding:0; -webkit-text-size-adjust:100%; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;">
        <!-- Professional print CSS for PDF generation -->
        <style>
          @media print {
            body, html { 
              width: 100%; 
              height: auto; 
              background-color: #ffffff !important; 
            }
            
            h1, h2, h3 { 
              page-break-after: avoid; 
              margin-top: 1.2em;
            }
            
            .image-container { 
              page-break-inside: avoid; 
            }
            
            p, ul, ol, dl, blockquote { 
              page-break-inside: auto; 
            }
            
            .section-break {
              page-break-after: always;
            }
            
            .content-container {
              page-break-inside: auto !important;
            }
          }
          
          /* Enhanced typography and spacing */
          .content-body h1, .content-body h2, .content-body h3 {
            font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;
          }
          
          .content-body p, .content-body li {
            font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;
          }
        </style>

        <!-- Professional newsletter container -->
        <div class="content-wrapper" style="width: 100%; max-width: 100%; margin: 0 auto; text-align: center; background-color: #f5f7fa; padding: 20px 0;">
          <div class="content-container" style="display: inline-block; width: 100%; max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 8px 32px rgba(20,42,75,0.12); text-align: left; border: 1px solid #d2ddec;">
            <div class="content-body" style="padding: 45px 50px; line-height: 1.8; color: #333333; font-size: 16px; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;">
              ${htmlBody}
            </div>
          </div>
          
          <div class="footer" style="text-align: center; padding: 35px 0 45px 0; font-size: 14px; color: #5774cd; font-family: 'Lato', Tahoma, Verdana, Segoe, sans-serif;">
            Powered by <strong>LetterNest</strong><br>
            <span style="color: #888; font-size: 12px;">Professional Newsletter Generation</span>
          </div>
        </div>
      </body>
    `);

    logStep("Converted 'Chain of Thought' markdown to HTML with professional design system");

    // 17) Send email via Resend (No changes here)
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@letternest.com"; 
      const emailSubject = `Chain of Thought: Your Weekly Insights from LetterNest`; 
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `LetterNest <${fromEmail}>`, to: profile.sending_email, subject: emailSubject, html: emailHtml, text: finalMarkdown 
      });
      if (emailError) { console.error("Error sending email with Resend:", emailError); throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`); }
      logStep("'Chain of Thought' Email sent successfully", { id: emailData?.id });
    } catch (sendErr) { console.error("Error sending email:", sendErr); }

    // 18) Save the newsletter to newsletter_storage table (No changes here)
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({ user_id: userId, markdown_text: finalMarkdown });
      if (storageError) { console.error("Failed to save 'Chain of Thought' newsletter to storage:", storageError); } 
      else { logStep("'Chain of Thought' Newsletter successfully saved to storage"); }
    } catch (storageErr) { console.error("Error saving 'Chain of Thought' newsletter to storage:", storageErr); }

    // 19) Update remaining generations count (No changes here)
    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase.from("profiles").update({ remaining_newsletter_generations: newCount }).eq("id", userId);
      if (updateError) { console.error("Failed to update remaining generations:", updateError); } 
      else { logStep("Updated remaining generations count", { newCount }); }
    }

    // 20) Final log & response (No changes here)
    const timestamp = new Date().toISOString();
    logStep("'Chain of Thought' newsletter generation successful with professional design", {
      userId, timestamp, tweetCount: selectedCount,
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0
    });
    return {
      status: "success",
      message: "'Chain of Thought' newsletter generated and process initiated for email.",
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
      data: { analysisResult: finalAnalysisForMarkdown, markdownNewsletter: finalMarkdown, timestamp }
    };
  } catch (error) {
    console.error("Error in background 'Chain of Thought' newsletter generation process:", error);
    return {
      status: "error",
      message: (error as Error).message || "Internal server error during 'Chain of Thought' generation"
    };
  }
}

// Main serve function (No changes here)
serve(async (req: Request) => {
  if (req.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
  try {
    logStep("Starting 'Chain of Thought' newsletter generation process (HTTP)");
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
      message: "Your 'Chain of Thought' newsletter generation has started. You will receive an email when it's ready.",
    }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
