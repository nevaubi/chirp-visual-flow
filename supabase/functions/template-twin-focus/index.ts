import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@4.3.0";
import juice from "https://esm.sh/juice@11.0.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Resend client
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Helper function for logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : "";
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

    // 4.5) IMMEDIATE DECREMENT - This is the key fix!
    // Atomically decrement the generation count to prevent spam clicking
    let newGenerationCount = profile.remaining_newsletter_generations;
    if (profile.remaining_newsletter_generations > 0) {
      const { data: updateResult, error: decrementError } = await supabase
        .from("profiles")
        .update({ 
          remaining_newsletter_generations: profile.remaining_newsletter_generations - 1 
        })
        .eq("id", userId)
        .eq("remaining_newsletter_generations", profile.remaining_newsletter_generations) // Ensure count hasn't changed
        .select("remaining_newsletter_generations")
        .single();
        
      if (decrementError || !updateResult) {
        console.error("Failed to decrement generations (possibly already decremented by another request):", decrementError);
        throw new Error("Unable to reserve newsletter generation slot. Please try again.");
      }
      
      // Update local variable for use throughout the function
      newGenerationCount = updateResult.remaining_newsletter_generations;
      logStep("Successfully reserved generation slot", { 
        originalCount: profile.remaining_newsletter_generations,
        remainingAfterDecrement: newGenerationCount 
      });
    }

    // Helper function to rollback the decrement if generation fails
    const rollbackDecrement = async () => {
      try {
        if (profile.remaining_newsletter_generations >= 0) {
          await supabase
            .from("profiles")
            .update({ 
              remaining_newsletter_generations: profile.remaining_newsletter_generations // Restore original count
            })
            .eq("id", userId);
          logStep("Rolled back generation count due to failure");
        }
      } catch (rollbackError) {
        console.error("Failed to rollback generation count:", rollbackError);
      }
    };

    // Wrap the entire generation process in try-catch for rollback
    try {
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
              "x-rapidapi-host": "twitter293.p.rapidapi.com",
            },
          });
          if (!resp.ok) throw new Error(`RapidAPI returned ${resp.status}`);
          const j = await resp.json();
          if (j?.user?.result?.rest_id) {
            numericalId = j.user.result.rest_id;
            const { error: updateError } = await supabase.from("profiles").update({
              numerical_id: numericalId,
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
          "Content-Type": "application/json",
        },
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
          "filter:blue_verified": false,
          "filter:consumer_video": false,
          "filter:has_engagement": false,
          "filter:hashtags": false,
          "filter:images": false,
          "filter:links": false,
          "filter:media": false,
          "filter:mentions": false,
          "filter:native_video": false,
          "filter:nativeretweets": false,
          "filter:news": false,
          "filter:pro_video": false,
          "filter:quote": false,
          "filter:replies": false,
          "filter:safe": false,
          "filter:spaces": false,
          "filter:twimg": false,
          "filter:videos": false,
          "filter:vine": false,
          lang: "en",
          maxItems: selectedCount,
          tweetIDs: tweetIds,
        }),
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

      // 9) Call OpenAI for main analysis
      logStep("Calling OpenAI for Twin Focus analysis");
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");

      const analysisSystemPrompt = `You are an expert content strategist for the "Twin Focus" newsletter template. Your task is to analyze a collection of tweets and organize them into a structured, balanced format that emphasizes dual perspectives and comparative analysis.

CAPABILITIES:
- Identify 3-4 main themes with dual perspectives or contrasting viewpoints
- Create balanced side-by-side comparisons
- Synthesize comprehensive insights with clear structure
- Generate engaging content with varied formatting

OUTPUT STRUCTURE:
1. **HOOK:** A compelling 1-2 sentence opener
2. **MAIN FOCUS AREAS (3-4 identified):**
   * **Focus Title:** Clear, engaging headline
   * **Dual Perspective:** Two contrasting viewpoints or complementary angles
     - **[Column Header A]:** One angle with 2-3 key points (dynamically generate a unique column header based on content)
     - **[Column Header B]:** Contrasting/complementary angle with 2-3 key points (dynamically generate a unique column header based on content)
   * **Synthesis:** How these perspectives connect (150-250 words)
   * **RepresentativeImageURL:** Most relevant image or "N/A"
3. **QUICK INSIGHTS (2-3 brief items):**
   * **Insight Title:** Brief, descriptive
   * **Summary:** 2-3 sentence overview
   * **RepresentativeImageURL:** Relevant image or "N/A"

CRITICAL INSTRUCTIONS:
- NO direct tweet quotes, IDs, or authors
- Focus on balanced, comparative analysis
- Tone: Conversational, accessible, 10th grade reading level
- Structure content for side-by-side presentation
- Dynamically generate unique column headers rather than using "Perspective A" and "Perspective B"
- Include image URLs where available

Tweet data to analyze:
${formattedTweets}`;

      const analysisUserPrompt = `Based on the tweet collection, generate content for the "Twin Focus" newsletter template:

1. HOOK (1-2 sentences)
2. 3-4 MAIN FOCUS AREAS, each with:
   * Focus Title
   * Dual Perspective with:
     - [Generate a unique subheader for Column A based on the content] (2-3 key points)
     - [Generate a unique subheader for Column B based on the content] (2-3 key points)
   * Synthesis (150-250 words connecting both perspectives)
   * RepresentativeImageURL (or "N/A")
3. 2-3 QUICK INSIGHTS, each with:
   * Insight Title
   * Summary (2-3 sentences)
   * RepresentativeImageURL (or "N/A")

Ensure balanced, comparative content that works well in a side-by-side layout. Dynamically name each column header meaningfully based on content.

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
          temperature: 0.5,
          max_tokens: 8000
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
      const queryGenerationPrompt = `You are an expert at identifying promising themes for web search enrichment. Given a Twin Focus analysis, select up to 3 focus areas that would benefit most from additional web-based context.
TASK: Review analysis, select up to 3 focus areas (relevance, complexity, value). For each: search query (25-50 chars), enrichment goal.
FORMAT:
===
FOCUS 1: [Focus Name]
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
          temperature: 0.3, max_tokens: 1000
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
        const focusesToEnrich: { focus: string; query: string; goal: string }[] = [];
        const regex = /FOCUS \d+:\s*(.+?)\s*QUERY:\s*(.+?)\s*ENRICHMENT GOAL:\s*(.+?)(?=\n\s*FOCUS \d+:|$)/gis;
        let match;
        while ((match = regex.exec(searchQueriesText)) !== null) {
          focusesToEnrich.push({ focus: match[1].trim(), query: match[2].trim(), goal: match[3].trim() });
        }
        const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
        if (!PERPLEXITY_API_KEY || focusesToEnrich.length === 0) {
          logStep("Missing Perplexity API key or no focus areas to enrich, continuing without web enrichment");
        } else {
          logStep("Making Perplexity API calls for web enrichment", { focusCount: focusesToEnrich.length });
          const enrichmentResults = [];
          for (const focus of focusesToEnrich) {
            try {
              const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
                body: JSON.stringify({ model: "sonar-pro", messages: [{ role: "user", content: focus.query }], temperature: 0.2, max_tokens: 400 })
              });
              if (perplexityRes.ok) {
                const data = await perplexityRes.json();
                enrichmentResults.push({ focusName: focus.focus, webSummary: data.choices[0].message.content, sources: data.choices[0].message.citations ?? [] });
                logStep(`Successfully enriched focus: ${focus.focus}`);
              } else {
                console.error(`Perplexity API error for "${focus.query}": ${perplexityRes.status}`, await perplexityRes.text());
                enrichmentResults.push({ focusName: focus.focus, webSummary: `[Perplexity error ${perplexityRes.status}]`, sources: [] });
              }
            } catch (err) {
              console.error(`Perplexity fetch failed for "${focus.query}":`, err);
              enrichmentResults.push({ focusName: focus.focus, webSummary: "[Perplexity request failed]", sources: [] });
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
RULES: Maintain original structure. For focus areas with web enrichment, weave 3-4+ points from 'webSummary' into 'Synthesis', under "Broader Context Online:" (make this substantial, 100-150 words if possible). Mention sources concisely. Ensure smooth flow.
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
              { role: "system", content: "You are an expert content editor, skilled at seamlessly integrating supplementary information." },
              { role: "user", content: integrationPrompt }
            ],
            temperature: 0.3, max_tokens: 8000
          })
        });
        if (integrationRes.ok) {
          const integrationJson = await integrationRes.json();
          finalAnalysisForMarkdown = integrationJson.choices[0].message.content.trim();
          logStep("Successfully integrated web content with Twin Focus analysis");
        } else {
          const txt = await integrationRes.text();
          console.error(`OpenAI integration error (${integrationRes.status}):`, txt);
          logStep("Failed to integrate web content, continuing with original analysis");
        }
      }

      // 13) Generate Markdown formatted newsletter for Twin Focus
      let markdownNewsletter = "";
      try {
        logStep("Starting Twin Focus markdown newsletter formatting");
        const markdownSystemPrompt = `You are a professional newsletter editor for the "Twin Focus" template. Format pre-analyzed content (hook, main focus areas with dual perspectives, quick insights, image URLs) into clean, beautiful, well-structured Markdown optimized for side-by-side layouts.

NEWSLETTER STRUCTURE:
1. HEADER: Title (H1 "Twin Focus"), Date (H3/Subtitle), Horizontal rule
2. INTRODUCTION: The "HOOK"
3. MAIN FOCUS SECTIONS: For each focus area:
   * Section Title (H2)
   * Image: If 'RepresentativeImageURL' is valid, include it
   * Dual Perspective layout: output a two-column Markdown table
     | **[Column A Header]** | **[Column B Header]** |
     | --- | --- |
     | (2-3 bullet points) | (2-3 bullet points) |
   * Synthesis (detailed explanation connecting both perspectives)
   * Horizontal rule for separation
4. QUICK INSIGHTS: Section Title (H2). For each insight:
   * Sub-section Title (H3)
   * Image: If 'RepresentativeImageURL' is valid, include it
   * Summary content
5. FOOTER: Horizontal rule, "Generated by LetterNest."

FORMATTING GUIDELINES:
- Clean Markdown with generous white space
- Professional, balanced, accessible tone
- Image Usage: Include 'RepresentativeImageURL' where valid
- Dual-column friendly structure
- Bold and italic formatting for emphasis
- Do not invent content - only format

OUTPUT: ONLY the formatted Markdown content.`;

        const markdownUserPrompt = `Format this Twin Focus analysis into the "Twin Focus" Markdown newsletter. Prioritize balanced layouts and include images.
Date: ${
          new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        }
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
              temperature: 0.2, max_tokens: 8000
            })
          });
          if (markdownOpenaiRes.ok) {
            const markdownJson = await markdownOpenaiRes.json();
            markdownNewsletter = markdownJson.choices[0].message.content;
            logStep("Twin Focus Markdown generated successfully");
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

      // 14) Clean up markdown
      function cleanMarkdown(md: string): string {
        let cleaned = md.replace(/^```(?:markdown)?\s*([\s\S]*?)\s*```$/i, "$1");
        cleaned = cleaned.trim();
        const lines = cleaned.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() !== "") {
            if (
              !lines[i].trim().startsWith("#") &&
              !lines[i].trim().startsWith("<h1") &&
              !lines[i].trim().startsWith("<div")
            ) {
              const headingMatch = cleaned.match(/(^|\n)(#+\s.*|<h[1-6].*>|<div.*>)/);
              if (
                headingMatch &&
                typeof headingMatch.index === "number" &&
                headingMatch.index > 0
              ) {
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
      const finalMarkdown = cleanMarkdown(markdownNewsletter);
      logStep("Cleaned up final markdown for Twin Focus");

      // 15) Convert final Markdown to HTML with styling
      const renderer = new marked.Renderer();

      // Paragraph renderer
      renderer.paragraph = (text) => {
        if (text.trim().startsWith("<div") || text.trim().startsWith("<span")) {
          return text.trim() + "\n";
        }
        return `<p style="margin: 0 0 1.2em 0; line-height: 1.7; font-size: 16px; color: #2c3e50; font-family: 'Helvetica Neue', Arial, sans-serif;">${text}</p>\n`;
      };

      // List item renderer
      renderer.listitem = (text, task, checked) => {
        if (task) {
          return `<li class="task-list-item"><input type="checkbox" ${checked ? "checked" : ""} disabled> ${text}</li>\n`;
        }
        return `<li style="margin: 0 0 1em 0; font-size: 16px; line-height: 1.6; color: #2c3e50; font-family: 'Helvetica Neue', Arial, sans-serif;">${text}</li>\n`;
      };

      // Heading renderer
      renderer.heading = (text, level) => {
        const sizes: Record<number, string> = { 1: "32px", 2: "28px", 3: "24px", 4: "20px", 5: "18px", 6: "16px" };
        const margins: Record<number, string> = { 1: "0 0 20px 0", 2: "28px 0 16px 0", 3: "24px 0 14px 0", 4: "20px 0 12px 0", 5: "18px 0 10px 0", 6: "16px 0 8px 0" };
        const colors: Record<number, string> = { 1: "#2c3e50", 2: "#34495e", 3: "#3d566e", 4: "#4a6a8e", 5: "#5b7da2", 6: "#6a8fb6" };

        const size = sizes[level] || "16px";
        const margin = margins[level] || "12px 0 8px 0";
        const color = colors[level] || "#2c3e50";

        return `<h${level} style="color:${color}; font-size:${size}; margin:${margin}; font-weight:700; line-height:1.3; font-family: 'Helvetica Neue', Arial, sans-serif;">${text}</h${level}>\n`;
      };

      // Image renderer
      renderer.image = (href, _title, alt) => `
        <div style="text-align:center; margin: 24px 0;">
          <img src="${href}"
               alt="${alt || "Newsletter image"}"
               style="max-width:100%; width:auto; max-height:400px; height:auto; border-radius:8px; display:inline-block; box-shadow: 0 6px 18px rgba(0,0,0,0.08); border:1px solid #dfe6e9;">
        </div>`;

      // Table renderer – 2-column responsive
      renderer.table = (header, body) => `
        <table style="width:100%;border-collapse:collapse;margin:24px 0; border-radius:6px; overflow:hidden;">
          <thead>
            ${header.replace(
        /<th>/g,
        '<th style="background:#eaf2f8;color:#2c3e50;padding:10px;font-size:15px;text-align:left;border-bottom:2px solid #bdc3c7;">',
      )}
          </thead>
          <tbody>
            ${body.replace(
        /<td>/g,
        '<td style="padding:10px 12px;font-size:15px;vertical-align:top;border-bottom:1px solid #dfe6e9;">',
      )}
          </tbody>
        </table>`;

      // Convert markdown to HTML
      const htmlBody = marked(finalMarkdown, { renderer });

      // Generate email HTML
      const emailHtml = juice(`
    <head>
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
    </head>
    <body bgcolor="#f2f6fa" style="background:#f2f6fa;margin:0;padding:0;">


          <style>
    /* ---------------  BRAND PALETTE  --------------- */
    :root{
      --brand-teal:  #01caa6;
      --brand-navy:  #1f254a;
      --brand-light: #ffffff;
      --page-bg:     #f2f6fa;      /* outer frame */
      --grad-soft:   linear-gradient(135deg,#e8fff8 0%,#ffffff 100%);
    }

    /* ---------------  LAYOUT  --------------- */
    body         { background:var(--page-bg); margin:0; padding:0;
                   font-family:'Inter', Arial, sans-serif; color:#34495e; }
    .wrapper     { max-width:620px; margin:0 auto; background:var(--brand-light);
                   border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,.08); }
    .content-body{ padding:32px 26px; }

    /* ---------------  TYPOGRAPHY  --------------- */
    h1{ font-size:30px; color:var(--brand-navy); margin:0 0 20px;
        font-weight:800; letter-spacing:-0.5px; }
    h2{ font-size:24px; color:var(--brand-navy); margin:32px 0 14px;
        font-weight:700; }
    h3{ font-size:20px; color:var(--brand-teal); margin:26px 0 12px;
        font-weight:700; }
    p, li{ font-size:17px; line-height:1.85; margin:0 0 1.2em; }

    /* ---------------  SEPARATORS & BOXES  --------------- */
    .section-divider{ height:2px;
                      background:linear-gradient(90deg,transparent,
                                  var(--brand-teal) 50%,transparent);
                      margin:40px 0; }

    .table-wrapper{ background:var(--grad-soft); border-radius:10px;
                    overflow:hidden; border:1px solid #d7f5ee; margin:24px 0; }

    /* ---------------  TABLES  --------------- */
    table{ width:100%; border-collapse:collapse; }
    table th{ background:var(--brand-teal); color:#ffffff; padding:14px;
              font-size:16px; text-align:left; }
    table td{ padding:14px; font-size:16px; border-top:1px solid #eaf4f2; }

    /* ---------------  IMAGES  --------------- */
    img.responsive{ max-width:100%; height:auto; border-radius:10px;
                    box-shadow:0 4px 18px rgba(0,0,0,.05); margin:24px 0; }

    /* ---------------  BLOCKQUOTES  --------------- */
    blockquote{ border-left:4px solid var(--brand-teal); padding-left:14px;
                margin:0 0 1.2em; font-style:italic; color:#5d6d7e; }

    /* ---------------  RESPONSIVE  --------------- */
    @media(max-width:600px){
      .content-body{ padding:26px 18px; }
      h1{ font-size:26px; }
      h2{ font-size:22px; }
      h3{ font-size:20px; }
      p, li{ font-size:16px; }
    }

    /* ---------------  PRINT (unchanged)  --------------- */
    @media print{
      body,html{ width:100%; margin:0; background:#ffffff !important; }
      .wrapper{ width:100% !important; max-width:none !important;
                border-radius:0 !important; }
      table{ width:100% !important; border-collapse:collapse; }
      table td{ padding:10px !important; font-size:14px !important;
                line-height:1.4 !important; }
      h1,h2,h3{ page-break-after:avoid; }
    }
  </style>



          <div class="wrapper" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;">
            <div class="content-body" style="padding:20px 16px;line-height:1.7;color:#2c3e50;font-size:16px;font-family:'Helvetica Neue',Arial,sans-serif;background:#ffffff;">
              ${htmlBody}
            </div>
          </div>

          <div style="text-align:center;padding:30px 0 40px 0;font-size:14px;color:#95a5a6;font-family:'Helvetica Neue',Arial,sans-serif;">
            Powered by <strong style="color:#2c3e50;">LetterNest</strong><br>
            <span style="color:#bdc3c7;font-size:12px;">Professional Newsletter Generation</span>
          </div>
        </body>`);

      logStep("Converted Twin Focus markdown to HTML with styling improvements");

      // 16) Send email via Resend
      try {
        const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@newsletters.letternest.ai";
        const emailSubject = `Twin Focus: Your Newsletter from LetterNest`;
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
        logStep("Twin Focus Email sent successfully", { id: emailData?.id });
      } catch (sendErr) {
        console.error("Error sending email:", sendErr);
      }

      // 17) Save the newsletter to newsletter_storage table
      try {
        const { error: storageError } = await supabase.from('newsletter_storage').insert({
          user_id: userId,
          markdown_text: finalMarkdown,
        });
        if (storageError) {
          console.error("Failed to save Twin Focus newsletter to storage:", storageError);
        } else {
          logStep("Twin Focus Newsletter successfully saved to storage");
        }
      } catch (storageErr) {
        console.error("Error saving Twin Focus newsletter to storage:", storageErr);
      }

      // 18) Final log & response - NO LONGER DECREMENT COUNT HERE!
      const timestamp = new Date().toISOString();
      logStep("Twin Focus newsletter generation successful", {
        userId,
        timestamp,
        tweetCount: selectedCount,
        remainingGenerations: newGenerationCount,
      });
      return {
        status: "success",
        message: "Twin Focus newsletter generated and process initiated for email.",
        remainingGenerations: newGenerationCount,
        data: { analysisResult: finalAnalysisForMarkdown, markdownNewsletter: finalMarkdown, timestamp }
      };

    } catch (generationError) {
      // Rollback the decrement since generation failed
      await rollbackDecrement();
      throw generationError;
    }

  } catch (error) {
    console.error("Error in background Twin Focus newsletter generation process:", error);
    return {
      status: "error",
      message: (error as Error).message || "Internal server error during Twin Focus generation"
    };
  }
}

// Main serve function
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    logStep("Starting Twin Focus newsletter generation process (HTTP)");
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
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      backgroundTask.then(result => { logStep("Background task completed (local/fallback)", result); })
      .catch(err => { console.error("Background task error (local/fallback):", err); });
    }
    return new Response(JSON.stringify({
      status: "processing",
      message: "Your Twin Focus newsletter generation has started. You will receive an email when it's ready.",
    }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in Twin Focus newsletter generation function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
