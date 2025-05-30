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

    // 14) Generate Enhanced Markdown with Superior UI/UX and Visual Appeal
    let enhancedMarkdownNewsletter = markdownNewsletter;
    try {
      logStep("Generating enhanced UI/UX markdown (premium visual design, rich colors, superior spacing)");
      const enhancedSystemPrompt = `
You are a premium newsletter design specialist. Transform "Chain of Thought" markdown into a **visually stunning** document using sophisticated inline HTML/CSS with a modern, elegant design system.

**PREMIUM COLOR PALETTE & VISUAL HIERARCHY:**
- **Primary Brand (Deep Teal):** #2C5F5D (Headings H1, H2, key accents, call-to-action elements)
- **Secondary Accent (Warm Sage):** #4A7C7E (H3, navigation elements, subtle highlights)
- **Tertiary Accent (Golden Amber):** #D4A853 (Special callouts, "THEME SNAPSHOT", premium touches)
- **Neutral Warm Grey:** #F8FAFB (Background sections, subtle containers)
- **Content Background:** #FFFFFF (Main content areas)
- **Rich Text:** #2A2A2A (Primary text, enhanced readability)
- **Muted Text:** #6B7280 (Secondary information, metadata)
- **Accent Border:** #E5E7EB (Dividers, container borders)

**TYPOGRAPHY & SPACING SYSTEM:**
- **H1:** 32px, font-weight: 700, letter-spacing: -0.025em, margin: 0 0 24px 0
- **H2:** 24px, font-weight: 600, letter-spacing: -0.015em, margin: 32px 0 16px 0
- **H3:** 20px, font-weight: 500, letter-spacing: -0.01em, margin: 24px 0 12px 0
- **Body Text:** 16px, line-height: 1.7, margin: 0 0 16px 0
- **Small Text:** 14px, line-height: 1.6

**ENHANCED COMPONENT STYLING:**

1. **Premium Headers:**
   \`<h1 style="color: #2C5F5D; font-size: 32px; font-weight: 700; letter-spacing: -0.025em; margin: 0 0 24px 0; padding-bottom: 12px; border-bottom: 3px solid #D4A853;">Chain of Thought</h1>\`

2. **Section Headers (H2):**
   \`<h2 style="color: #2C5F5D; font-size: 24px; font-weight: 600; letter-spacing: -0.015em; margin: 32px 0 16px 0; padding: 16px 0 8px 0; border-left: 4px solid #4A7C7E; padding-left: 16px; background: linear-gradient(90deg, #F8FAFB 0%, transparent 100%);">Title</h2>\`

3. **Subsection Headers (H3):**
   \`<h3 style="color: #4A7C7E; font-size: 20px; font-weight: 500; margin: 24px 0 12px 0; display: flex; align-items: center;"><span style="width: 6px; height: 6px; background: #D4A853; border-radius: 50%; margin-right: 12px;"></span>Title</h3>\`

4. **Enhanced "The Gist" Blockquotes:**
   \`<div style="background: linear-gradient(135deg, #F8FAFB 0%, #FFFFFF 100%); padding: 24px 28px; border-radius: 12px; margin: 24px 0; border-left: 5px solid #2C5F5D; box-shadow: 0 2px 8px rgba(44, 95, 93, 0.08); position: relative; overflow: hidden;"><div style="position: absolute; top: 0; right: 0; width: 60px; height: 60px; background: radial-gradient(circle, #D4A853 0%, transparent 70%); opacity: 0.1;"></div><p style="font-style: italic; color: #2A2A2A; margin: 0; font-size: 16px; line-height: 1.7; position: relative;">The Gist content</p></div>\`

5. **Premium Key Takeaway Boxes:**
   \`<div style="background: linear-gradient(135deg, #2C5F5D 0%, #4A7C7E 100%); color: white; padding: 20px 24px; border-radius: 10px; margin: 24px 0; position: relative; overflow: hidden;"><div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div><div style="position: relative;"><strong style="color: #D4A853; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">🔑 KEY TAKEAWAY</strong><p style="margin: 8px 0 0 0; font-size: 16px; line-height: 1.6;">Takeaway content</p></div></div>\`

6. **Elegant Theme Snapshots:**
   \`<div style="text-align: center; margin: 32px 0; padding: 24px; background: linear-gradient(45deg, #F8FAFB, #FFFFFF); border-radius: 16px; border: 1px solid #E5E7EB; position: relative;"><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 200px; background: radial-gradient(circle, #D4A853 0%, transparent 70%); opacity: 0.05; border-radius: 50%;"></div><p style="font-style: italic; color: #D4A853; font-size: 18px; font-weight: 500; margin: 0; position: relative; line-height: 1.5;">"Theme snapshot content"</p></div>\`

7. **Superior List Styling:**
   \`<li style="margin-bottom: 12px; padding-left: 8px; position: relative; color: #2A2A2A; line-height: 1.7;"><span style="position: absolute; left: -16px; top: 8px; width: 6px; height: 6px; background: #4A7C7E; border-radius: 50%;"></span>List content</li>\`

8. **Premium Image Containers:**
   \`<div style="text-align: center; margin: 32px 0; padding: 8px; background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(44, 95, 93, 0.12); border: 1px solid #E5E7EB;"><img src="url" alt="description" style="max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 0 auto;"></div>\`

9. **Sophisticated Dividers:**
   \`<div style="margin: 40px 0; text-align: center;"><div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #D4A853 20%, #2C5F5D 50%, #D4A853 80%, transparent 100%); margin: 0 auto; width: 60%;"></div></div>\`

10. **Enhanced Paragraph Styling:**
    \`<p style="color: #2A2A2A; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">Content</p>\`

**INTEGRATION RULES:**
- Apply these premium styles consistently throughout
- Ensure all color values match the specified palette exactly
- Use the gradient backgrounds and subtle shadows for depth
- Maintain email client compatibility
- Replace simple elements with these enhanced versions
- Preserve all content while elevating the visual presentation

Transform the markdown into a premium, visually stunning newsletter that rivals top-tier publications.
`;
      
      const enhancedUserPrompt = `
Transform this "Chain of Thought" markdown into a **premium visual experience** using the sophisticated design system and enhanced styling rules. Apply the rich color palette, elegant typography, gradient backgrounds, and premium component styling throughout.

Pay special attention to:
- Converting headers to the premium styled versions
- Enhancing blockquotes with gradient backgrounds and subtle shadows
- Styling KEY TAKEAWAY boxes with the gradient design
- Adding sophisticated dividers between sections
- Improving image presentation with elegant containers
- Upgrading list items with custom styling

Current Newsletter Markdown:
${markdownNewsletter}
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
            temperature: 0.1,
            max_tokens: 4090 
          })
        });
        if (enhancedOpenaiRes.ok) {
          const enhancedJson = await enhancedOpenaiRes.json();
          enhancedMarkdownNewsletter = enhancedJson.choices[0].message.content;
          logStep("Premium UI/UX markdown with rich visuals generated successfully");
        } else {
          const errorText = await enhancedOpenaiRes.text();
          console.error(`Enhanced Markdown formatting OpenAI error (${enhancedOpenaiRes.status}):`, errorText);
        }
      } catch (enhancedError) {
        console.error("Error in premium UI/UX markdown formatting API call:", enhancedError);
      }
    } catch (err) {
      console.error("Error generating Premium UI/UX Markdown newsletter:", err);
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

    // 16) Convert final Markdown to HTML & inline CSS with enhanced renderer
    const renderer = new marked.Renderer();
    
    // Enhanced paragraph rendering with premium styling
    renderer.paragraph = (text) => {
        if (text.trim().startsWith('<div style="height: 1px;') || 
            text.trim().startsWith('<div style="margin: 40px 0;') ||
            text.trim().startsWith('<div style="background:') ||
            text.trim().startsWith('<div style="text-align: center;')) {
            return text.trim() + '\n';
        }
        return `<p style="color: #2A2A2A; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">${text}</p>\n`;
    };

    // Enhanced image rendering with premium containers
    renderer.image = (href, _title, alt) => `
      <div style="text-align: center; margin: 32px 0; padding: 8px; background: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 20px rgba(44, 95, 93, 0.12); border: 1px solid #E5E7EB;">
        <img src="${href}"
             alt="${alt || 'Newsletter image'}"
             style="max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 0 auto;">
      </div>
    `;

    const htmlBody = marked(finalMarkdown, { renderer });

    // Enhanced email template with premium styling
    const emailHtml = juice(`
      <body style="background: linear-gradient(135deg, #F8FAFB 0%, #E5E7EB 100%); margin: 0; padding: 0; -webkit-text-size-adjust: 100%; font-family: 'Georgia', serif;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #F8FAFB 0%, #E5E7EB 100%); min-height: 100vh;">
          <tr><td align="center" style="padding: 40px 20px;">
            <table width="700" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 700px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; box-shadow: 0 10px 30px rgba(44, 95, 93, 0.15); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #2C5F5D 0%, #4A7C7E 100%); padding: 32px 48px; text-align: center;">
                  <div style="color: #FFFFFF; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; opacity: 0.9;">LetterNest Newsletter</div>
                  <div style="color: #D4A853; font-size: 24px; font-weight: 700;">Chain of Thought</div>
                </td>
              </tr>
              <tr><td style="padding: 48px 48px 24px 48px; line-height: 1.7; color: #2A2A2A; font-size: 16px;">
                ${htmlBody}
              </td></tr>
              <tr>
                <td style="background: linear-gradient(135deg, #F8FAFB 0%, #FFFFFF 100%); padding: 32px 48px; border-top: 1px solid #E5E7EB; text-align: center;">
                  <div style="color: #6B7280; font-size: 14px; margin-bottom: 8px;">Crafted with care by</div>
                  <div style="color: #2C5F5D; font-size: 18px; font-weight: 600;">LetterNest</div>
                  <div style="margin-top: 16px; font-size: 12px; color: #9CA3AF;">
                    Your AI-powered newsletter companion
                  </div>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
    `);
    
    logStep("Converted premium markdown to HTML with enhanced visual styling");

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
    logStep("'Chain of Thought' newsletter generation successful (final aesthetic)", {
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
