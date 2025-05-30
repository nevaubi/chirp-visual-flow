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
      if (bookmarksResp.status === 401) {
        throw new Error("Your Twitter access token is invalid. Please reconnect your Twitter bookmarks.");
      }
      if (bookmarksResp.status === 429) {
        throw new Error("Twitter API rate limit exceeded. Please try again later.");
      }
      throw new Error(`Twitter API error: ${bookmarksResp.status}`);
    }
    const bookmarksData = await bookmarksResp.json();
    if (!bookmarksData?.data) {
      console.error("Invalid or empty bookmark data:", bookmarksData);
      if (bookmarksData.meta?.result_count === 0) {
        throw new Error("You don't have any bookmarks. Please save some tweets before generating a newsletter.");
      }
      throw new Error("Failed to retrieve bookmarks from Twitter");
    }
    const tweetIds = bookmarksData.data.map((t) => t.id);
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

    // 9) Call OpenAI for main analysis (MODIFIED FOR LENGTH & IMAGES)
    logStep("Calling OpenAI for initial thematic analysis and hook generation");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");
    
    const analysisSystemPrompt = `You are an expert content strategist and analyst. Your task is to analyze a collection of tweets and synthesize them into substantial, insightful themes for a sophisticated newsletter. You must also craft an engaging introductory hook and proactively identify relevant imagery.

CAPABILITIES:
- Identify 4-5 main thematic clusters from the provided tweet data.
- For each theme, synthesize core ideas, discussions, and sentiments into detailed explanations.
- Identify 3-4 secondary or emerging themes (sub-topics) with comprehensive summaries.
- Generate a compelling 1-2 sentence "hook" or "teaser".
- For EACH main theme and EACH noteworthy sidetrack, actively try to select a highly relevant PhotoUrl from the provided data that visually encapsulates the theme.

OUTPUT STRUCTURE:
Your output should be a structured text. Start with the hook, then detail the main themes and sub-themes.

1.  **HOOK:**
    *   A 1-2 sentence engaging teaser for the newsletter.

2.  **MAIN THEMES (4-5 identified):**
    *   **Theme Title:** A concise, engaging title.
    *   **The Gist:** A 3-4 sentence summary of the core idea.
    *   **Key Insights:** 4-5 bullet points synthesizing significant discussions, patterns, or sentiments. (Approx. 50-70 words per bullet).
    *   **Deeper Dive:** A substantial paragraph (approx. 300-450 words) expanding on the theme, covering context, predominant sentiment, key perspectives, notable trends, and potential implications. This should be a rich synthesis.
    *   **RepresentativeImageURL (Strive to include):** From the provided PhotoUrls, select the single most compelling and thematically relevant image for this theme. If no suitable image is found, state "N/A".

3.  **NOTEWORTHY SIDETRACKS (3-4 identified sub-topics):**
    *   **Sidetrack Title:** A brief, descriptive title.
    *   **Quick Take:** A 2-3 sentence summary of this theme.
    *   **RepresentativeImageURL (Strive to include):** From the PhotoUrls, select a relevant image for this sidetrack. If none, state "N/A".

CRITICAL INSTRUCTIONS:
- **DO NOT** include direct quotes from tweets.
- **DO NOT** list individual tweet IDs or authors.
- Focus on **comprehensive synthesis, abstraction, and thematic storytelling.**
- The tone should be professional, insightful, and accessible.
- Strive for substantial content in "Deeper Dive" sections.
- Actively seek out and include relevant 'RepresentativeImageURL' for all themes and sidetracks where possible.

Tweet data to analyze:
${formattedTweets}`;
    
    const analysisUserPrompt = `Based on the provided tweet collection, please generate:
1.  An engaging 1-2 sentence HOOK.
2.  An analysis identifying 4-5 MAIN THEMES. For each:
    *   Engaging Theme Title.
    *   "The Gist" (3-4 sentences).
    *   4-5 "Key Insights" as bullet points (synthesized, 50-70 words each).
    *   A "Deeper Dive" paragraph (300-450 words, synthesized).
    *   A 'RepresentativeImageURL' (or "N/A").
3.  An analysis identifying 3-4 NOTEWORTHY SIDETRACKS. For each:
    *   Sidetrack Title.
    *   "Quick Take" (2-3 sentences).
    *   A 'RepresentativeImageURL' (or "N/A").

Ensure all textual content is substantial and insightful. Proactively include image URLs.

Here is the tweet collection:
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
        max_tokens: 4090 // Increased for longer content
      })
    });
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(`OpenAI API error (${openaiRes.status}):`, txt);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    const openaiJson = await openaiRes.json();
    let analysisResult = openaiJson.choices[0].message.content.trim();
    logStep("Successfully generated initial thematic analysis and hook (longer, more images)");

    // 10) Topic Selection and Query Generation for Perplexity (Largely Unchanged)
    logStep("Selecting topics and generating search queries for Perplexity");
    const queryGenerationPrompt = `You are an expert at identifying promising themes for web search enrichment. Given a thematic analysis of Twitter bookmarks, select up to 3 themes that would benefit most from additional web-based context.

TASK:
1. Review the provided thematic analysis.
2. Select up to 3 themes based on relevance, complexity, and educational value.
3. For each, create:
   - A search query string (25-50 chars).
   - An enrichment goal.

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
                body: JSON.stringify({
                  model: "sonar-pro", 
                  messages: [{ role: "user", content: topic.query }],
                  temperature: 0.2, max_tokens: 400 // Increased slightly for potentially richer summaries
                })
              }
            );
            if (perplexityRes.ok) {
              const data = await perplexityRes.json();
              enrichmentResults.push({
                themeName: topic.theme,
                webSummary: data.choices[0].message.content,
                sources: data.choices[0].message.citations ?? [] 
              });
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
        if (enrichmentResults.length > 0) {
          webEnrichmentContent = enrichmentResults;
          logStep("Web enrichment data collected");
        }
      }
    }

    // 12) Integrate Web Content with Original Analysis (MODIFIED FOR LENGTH)
    let finalAnalysisForMarkdown = analysisResult; 

    if (webEnrichmentContent && webEnrichmentContent.length > 0) {
        logStep("Integrating web content with original thematic analysis");
        const integrationPrompt = `You are an expert content editor. You have an initial thematic analysis and supplementary web-sourced information. Integrate the web insights into the relevant themes.

INTEGRATION RULES:
- Maintain the original analysis structure (Hook, Main Themes, Noteworthy Sidetracks).
- For each theme with web enrichment:
    - Weave 3-4 key points (or more, if 'webSummary' is rich) from 'webSummary' into the 'Deeper Dive' section.
    - Add a subsection "Broader Context Online:" within 'Deeper Dive' for these web insights. Make this section substantial (e.g., 100-150 words from the web summary if available).
    - Mention sources concisely if relevant.
- Ensure smooth transitions and consistent tone. Enhance, don't replace.

ORIGINAL THEMATIC ANALYSIS:
${analysisResult}

WEB-SOURCED INFORMATION:
${JSON.stringify(webEnrichmentContent, null, 2)}

Provide the complete, integrated analysis. Themes without web enrichment remain unchanged.`;

        const integrationRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are an expert content editor, skilled at seamlessly integrating supplementary information to create richer, more detailed texts." },
                    { role: "user", content: integrationPrompt }
                ],
                temperature: 0.3,
                max_tokens: 4090 // Ensure enough for combined length
            })
        });

        if (integrationRes.ok) {
            const integrationJson = await integrationRes.json();
            finalAnalysisForMarkdown = integrationJson.choices[0].message.content.trim();
            logStep("Successfully integrated web content with thematic analysis (for length)");
        } else {
            const txt = await integrationRes.text();
            console.error(`OpenAI integration error (${integrationRes.status}):`, txt);
            logStep("Failed to integrate web content, continuing with original thematic analysis");
        }
    }

    // 13) Generate Markdown formatted newsletter (MODIFIED FOR IMAGES)
    let markdownNewsletter = "";
    try {
      logStep("Starting 'Chain of Thought' markdown newsletter formatting");
      const markdownSystemPrompt = `You are a professional newsletter editor for "Chain of Thought" by LetterNest. Format pre-analyzed thematic content (hook, main themes, sidetracks, with image URLs) into a beautiful, professional, visually appealing Markdown newsletter.

NEWSLETTER STRUCTURE: "Chain of Thought"
1.  HEADER: Title (H1 "Chain of Thought"), Date (H3/Subtitle), Subtle horizontal rule.
2.  INTRODUCTION: The "HOOK" as an engaging paragraph.
3.  MAIN THEMATIC SECTIONS: For each main theme:
    *   Section Title (H2).
    *   "The Gist" (Blockquoted/emphasized).
    *   "Key Insights" (Bulleted list).
    *   "Deeper Dive" (Regular text, including any integrated web content).
    *   **Image Integration:** If 'RepresentativeImageURL' is provided (and not "N/A"), include the image after "The Gist" or at the start of "Deeper Dive".
    *   Subtle horizontal rule or extra spacing before next theme.
4.  NOTEWORTHY SIDETRACKS: Section Title (H2). For each sidetrack:
    *   Sub-section Title (H3).
    *   "Quick Take" (Regular text).
    *   **Image Integration:** If 'RepresentativeImageURL' is provided (and not "N/A"), include it.
5.  FOOTER: Clear horizontal rule, "Generated by LetterNest."

FORMATTING GUIDELINES:
- Clean Markdown. Generous white space. Professional, insightful, engaging tone.
- **Image Usage:** Include 'RepresentativeImageURL' where provided and valid (not "N/A"). Aim for 3-5 well-placed, thematically relevant images if available in the analysis. Ensure images are appropriately sized by the renderer.
- Do not invent content. Only format the provided analysis.

OUTPUT: ONLY the formatted Markdown content.`;
      
      const markdownUserPrompt = `Format this thematic analysis into the "Chain of Thought" Markdown newsletter for LetterNest, following the structure and guidelines. Prioritize including provided images.
Current Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

THEMATIC ANALYSIS CONTENT (includes HOOK, MAIN THEMES with image URLs, SIDETRACKS with image URLs):
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
          logStep("'Chain of Thought' Markdown newsletter generated successfully (more images)");
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

    // 14) Generate Enhanced Markdown with UI/UX improvements (MODIFIED FOR COLOR SCHEME & DIVIDERS)
    let enhancedMarkdownNewsletter = markdownNewsletter;
    try {
      logStep("Generating enhanced UI/UX markdown for 'Chain of Thought' (color scheme, dividers)");
      const enhancedSystemPrompt = `
You are a newsletter UI/UX specialist. Your goal is to take well-structured "Chain of Thought" markdown and output a **visually enhanced** markdown document using inline HTML/CSS, ready for email.

COLOR PALETTE & STYLING:
- **Primary Accent (Deep Blue):** #0A417A (Use for H1, H2 headings)
- **Secondary Accent (Muted Blue/Grey):** #607D8B (Use for H3 headings, subtle text accents if needed)
- **Callout Background (Very Light Grey):** #F4F6F8 (Use for \`<div ...>\` styling "The Gist" or blockquotes)
- **Divider Color:** #D1D9E0 (A light grey for horizontal rule styled divs)
- **Body Text:** #333333 (Standard dark grey for readability)
- **Font:** Suggest "Arial, sans-serif" or a similar clean, widely available font family in the main body style.

ENHANCEMENT RULES:
1.  **Headings:**
    *   H1 ("Chain of Thought"): \`<h1 style="color: ${"#0A417A"}; margin-bottom: 5px;">Chain of Thought</h1>\`
    *   H2 (Main Theme Titles, "Noteworthy Sidetracks"): Wrap content in \`<span style="color: ${"#0A417A"};">\`.
    *   H3 (Date, Sidetrack Titles): Wrap content in \`<span style="color: ${"#607D8B"};">\`.
2.  **Spacing & Layout:**
    *   Ensure one blank line (double newline in Markdown) before/after headings, lists, styled divs, and images.
    *   "The Gist" / Blockquotes: Wrap in \`<div style="background-color: ${"#F4F6F8"}; padding: 15px 20px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${"#0A417A"};">\`.
3.  **Dividers:**
    *   Replace Markdown '---' (if any are generated by previous step for structure) OR add new dividers between major sections (e.g., after intro, between main themes, before sidetracks, before footer) with:
        \`<div style="height: 1px; background-color: ${"#D1D9E0"}; margin: 30px 0;"></div>\`
4.  **General:**
    *   The input markdown is already written. **Only apply visual styling.** Do not alter content or core structure.
    *   Ensure all HTML/CSS is email-client friendly.
    *   Prioritize a clean, professional, modern, and visually appealing aesthetic.

Produce valid markdown with these inline HTML/CSS enhancements.
`;
      
      const enhancedUserPrompt = `
Transform the "Chain of Thought" markdown below into a **visually enhanced** version using the specified color palette and styling rules (headings, callouts, dividers) via inline HTML/CSS.

**Do not change the content or the core markdown structure.** Only add styling.

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
            temperature: 0.2, // Low temp for precise styling
            max_tokens: 4090 
          })
        });
        if (enhancedOpenaiRes.ok) {
          const enhancedJson = await enhancedOpenaiRes.json();
          enhancedMarkdownNewsletter = enhancedJson.choices[0].message.content;
          logStep("Enhanced UI/UX markdown (color, dividers) generated successfully");
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
          if (!lines[i].trim().startsWith("#") && !lines[i].trim().startsWith("<h1") && !lines[i].trim().startsWith("<div")) { // Check for HTML too
            const headingMatch = cleaned.match(/(^|\n)(#+\s.*|<h[1-6].*>|<div.*>)/); // Broader match
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

    // 16) Convert final Markdown to HTML & inline CSS
    const renderer = new marked.Renderer();
    // Override paragraph rendering to avoid <p> tags around custom <div> dividers
    renderer.paragraph = (text) => {
        if (text.trim().startsWith('<div style="height: 1px;')) {
            return text.trim() + '\n'; // Return the div as is
        }
        return '<p>' + text + '</p>\n';
    };
    renderer.image = (href, _title, alt) => `
      <div style="text-align:center; margin-top: 15px; margin-bottom: 25px;">
        <img src="${href}"
             alt="${alt || 'Newsletter image'}"
             style="max-width:100%; width:auto; max-height:450px; height:auto; border-radius:8px; display:inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      </div>`; // Enhanced image style

    const htmlBody = marked(finalMarkdown, { renderer });

    const emailHtml = juice(`
      <body style="background-color:#E8EFF5; margin:0; padding:0; -webkit-text-size-adjust:100%; font-family: Arial, sans-serif;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#E8EFF5;">
          <tr><td align="center" style="padding:25px 0;">
            <table width="640" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px; margin:0 auto; background-color:#ffffff; border-radius:10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
              <tr><td style="padding:35px 40px; line-height:1.65; color:#333333; font-size:16px;">
                ${htmlBody}
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center" style="padding:25px 0 35px 0; font-size:13px; color:#555555;">
            Powered by LetterNest<br>
            <!-- Unsubscribe links etc. -->
          </td></tr>
        </table>
      </body>
    `);
    
    logStep("Converted 'Chain of Thought' markdown to HTML with inline CSS (enhanced style)");

    // 17) Send email via Resend
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@letternest.com"; 
      const emailSubject = `Chain of Thought: Your Weekly Insights from LetterNest`; 

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
      logStep("'Chain of Thought' Email sent successfully", { id: emailData?.id });
    } catch (sendErr) {
      console.error("Error sending email:", sendErr);
    }

    // 18) Save the newsletter to newsletter_storage table
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({
        user_id: userId,
        markdown_text: finalMarkdown,
      });
      if (storageError) {
        console.error("Failed to save 'Chain of Thought' newsletter to storage:", storageError);
      } else {
        logStep("'Chain of Thought' Newsletter successfully saved to storage");
      }
    } catch (storageErr) {
      console.error("Error saving 'Chain of Thought' newsletter to storage:", storageErr);
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

    // 20) Final log & response
    const timestamp = new Date().toISOString();
    logStep("'Chain of Thought' newsletter generation successful (enhanced)", {
      userId, timestamp, tweetCount: selectedCount,
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0
    });

    return {
      status: "success",
      message: "'Chain of Thought' newsletter generated and process initiated for email.",
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
      data: {
        analysisResult: finalAnalysisForMarkdown, 
        markdownNewsletter: finalMarkdown, 
        timestamp
      }
    };
  } catch (error) {
    console.error("Error in background 'Chain of Thought' newsletter generation process:", error);
    return {
      status: "error",
      message: (error as Error).message || "Internal server error during 'Chain of Thought' generation"
    };
  }
}

// Main serve function that handles the HTTP request
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
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
      message: "Your 'Chain of Thought' newsletter generation has started. You will receive an email when it's ready.",
    }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
