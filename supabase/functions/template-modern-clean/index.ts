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
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              numerical_id: numericalId
            })
            .eq("id", userId);
            
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
      headers: {
        "Content-Type": "application/json"
      },
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
        tweetIDs: tweetIds
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
    function parseToOpenAI(data) {
      const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      let out = "";
      
      arr.forEach((t, i) => {
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try {
          dateStr = new Date(t.createdAt).toISOString().split("T")[0];
        } catch {}
        
        const photo = t.extendedEntities?.media?.find((m) => m.type === "photo")?.media_url_https;
        
        out += `Tweet ${i + 1}\n`;
        out += `Tweet ID: ${t.id}\n`;
        out += `Tweet text: ${txt}\n`;
        out += `ReplyAmount: ${t.replyCount || 0}\n`;
        out += `LikesAmount: ${t.likeCount || 0}\n`;
        out += `Impressions: ${t.viewCount || 0}\n`;
        out += `Date: ${dateStr}\n`;
        out += `Tweet Author: ${t.author?.name || "Unknown"}\n`;
        out += `PhotoUrl: ${photo || "N/A"}\n`;
        
        if (i < arr.length - 1) out += "\n---\n\n";
      });
      
      return out;
    }
    
    const formattedTweets = parseToOpenAI(apifyData);
    logStep("Formatted tweets for analysis");

    // 9) Call OpenAI for main analysis
    logStep("Calling OpenAI for initial thematic analysis and hook generation");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");
    
    const analysisSystemPrompt = `You are an expert content strategist and analyst. Your task is to analyze a collection of tweets and synthesize them into high-level themes and insights, suitable for a sophisticated newsletter. You must also craft an engaging introductory hook.

CAPABILITIES:
- Identify 3-4 main thematic clusters from the provided tweet data.
- For each theme, synthesize the core ideas, discussions, and sentiments without directly quoting individual tweets or listing tweet-specific data.
- Identify 2-3 secondary or emerging themes (sub-topics) with concise summaries.
- Generate a compelling 1-2 sentence "hook" or "teaser" that summarizes the most interesting aspects of the week's bookmarks, designed to draw the reader in.
- Determine if any available PhotoUrls are generally representative of the major themes, but do not tie them to specific points.

OUTPUT STRUCTURE:
Your output should be a structured text. Start with the hook, then detail the main themes and sub-themes.

1.  **HOOK:**
    *   A 1-2 sentence engaging teaser for the newsletter.

2.  **MAIN THEMES (3-4 identified):**
    *   **Theme Title:** A concise, engaging title for the theme (e.g., "The Evolving Landscape of X," "Key Debates in Y").
    *   **The Gist:** A 2-3 sentence summary of the core idea of this theme as reflected in the bookmarks.
    *   **Key Insights:** 3-4 bullet points synthesizing the significant discussions, patterns, or sentiments related to this theme. These should be generalized insights, not direct references to specific tweets. (Approx. 30-50 words per bullet).
    *   **Deeper Dive:** A paragraph (approx. 150-250 words) expanding on the theme, covering context, predominant sentiment, key perspectives, and notable trends. This should be a synthesis, not a collection of tweet summaries.
    *   **RepresentativeImageURL (Optional):** If a highly relevant image URL from the provided tweet data broadly represents this theme, include it. Otherwise, omit.

3.  **NOTEWORTHY SIDETRACKS (2-3 identified sub-topics):**
    *   **Sidetrack Title:** A brief, descriptive title.
    *   **Quick Take:** A 1-2 sentence summary of this less dominant but interesting theme.

CRITICAL INSTRUCTIONS:
- **DO NOT** include direct quotes from tweets in your analysis.
- **DO NOT** list individual tweet IDs, authors, or specific engagement metrics in the thematic summaries.
- Focus on **synthesis, abstraction, and thematic storytelling.**
- The tone should be professional, insightful, and accessible (approx. 10th-grade reading level, natural language).
- The goal is to provide the user with a high-level understanding of the patterns in their bookmarks.

Tweet data to analyze:
${formattedTweets}`;
    
    const analysisUserPrompt = `Based on the provided tweet collection, please generate:
1.  An engaging 1-2 sentence HOOK for a newsletter summarizing the key takeaways from these bookmarks.
2.  An analysis identifying 3-4 MAIN THEMES. For each main theme:
    *   Create an engaging Theme Title.
    *   Write "The Gist" (2-3 sentence summary).
    *   Provide 3-4 "Key Insights" as bullet points (synthesized, no direct tweet details).
    *   Write a "Deeper Dive" paragraph (150-250 words, synthesized).
    *   Optionally, suggest a single RepresentativeImageURL if one broadly fits the theme.
3.  An analysis identifying 2-3 NOTEWORTHY SIDETRACKS (sub-topics). For each:
    *   Create a Sidetrack Title.
    *   Write a "Quick Take" (1-2 sentence summary).

Remember to synthesize insights and avoid mentioning specific tweet details, authors, or direct quotes. Focus on the overarching themes and patterns.

Here is the tweet collection:
${formattedTweets}`;
    
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: analysisSystemPrompt
          },
          {
            role: "user",
            content: analysisUserPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 3500
      })
    });
    
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(`OpenAI API error (${openaiRes.status}):`, txt);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    
    const openaiJson = await openaiRes.json();
    let analysisResult = openaiJson.choices[0].message.content.trim();
    logStep("Successfully generated initial thematic analysis and hook");

    // 10) Topic Selection and Query Generation for Perplexity
    logStep("Selecting topics and generating search queries for Perplexity");
    const queryGenerationPrompt = `You are an expert at identifying the most promising themes for web search enrichment from a content analysis. Given an analysis of Twitter bookmarks (summarized into themes), select up to 3 themes that would benefit most from additional web-based context and information.

For each selected theme, create a precise search query that will return relevant, current, and comprehensive information.

TASK:
1. Review the provided thematic analysis.
2. Select up to 3 themes based on:
   - Relevance to current events or broader discussions.
   - Complexity (themes that would benefit from additional context).
   - Potential for educational value or deeper understanding.
3. For each selected theme, create:
   - A search query string (25-50 characters) optimized for web search.
   - A brief explanation of what specific information or context (enrichment goal) would most enhance this theme.

FORMAT YOUR RESPONSE AS:
===
THEME 1: [Theme Name from Analysis]
QUERY: [Search Query]
ENRICHMENT GOAL: [What specific information or context we want to add]

THEME 2: [Theme Name from Analysis]
QUERY: [Search Query]
ENRICHMENT GOAL: [What specific information or context we want to add]

THEME 3: [Theme Name from Analysis]
QUERY: [Search Query]
ENRICHMENT GOAL: [What specific information or context we want to add]
===
If fewer than 3 themes are suitable for enrichment, provide only those.

THEMATIC ANALYSIS TO REVIEW:
${analysisResult}`;

    const queryGenRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a search query optimization specialist who helps select the most promising themes for enrichment and creates perfect search queries."
          },
          {
            role: "user",
            content: queryGenerationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });
    
    let webEnrichmentContent = null;

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
        topicsToEnrich.push({
          theme: match[1].trim(),
          query: match[2].trim(),
          goal: match[3].trim()
        });
      }
      
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      if (!PERPLEXITY_API_KEY || topicsToEnrich.length === 0) {
        logStep("Missing Perplexity API key or no topics to enrich, continuing without web enrichment");
      } else {
        logStep("Making Perplexity API calls for web enrichment", { topicsCount: topicsToEnrich.length });
        const enrichmentResults = [];
        for (const topic of topicsToEnrich) {
          try {
            // FIXED: Use correct Perplexity model
            const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${PERPLEXITY_API_KEY}`
                },
                body: JSON.stringify({
                  model: "sonar-pro", // Fixed model name
                  messages: [{ role: "user", content: topic.query }],
                  temperature: 0.2,
                  max_tokens: 350
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

    // 12) Integrate Web Content with Original Analysis
    let finalAnalysisForMarkdown = analysisResult;

    if (webEnrichmentContent && webEnrichmentContent.length > 0) {
        logStep("Integrating web content with original thematic analysis");
        const integrationPrompt = `You are an expert content editor. You have an initial thematic analysis of Twitter bookmarks and supplementary web-sourced information for some of these themes.
Your task is to seamlessly integrate the web-sourced insights into the relevant themes within the original analysis.

INTEGRATION RULES:
- Maintain the overall structure of the original analysis (Hook, Main Themes, Noteworthy Sidetracks).
- For each theme that has corresponding web enrichment data:
    - Weave 2-3 key points from the 'webSummary' naturally into the 'Deeper Dive' section of that theme.
    - Add a small subsection titled "Broader Context Online:" or "From Around the Web:" within the 'Deeper Dive' to present these web insights.
    - If sources are provided, you can mention "Recent discussions online also point to..." or similar, without explicitly listing all source URLs unless highly relevant and concise.
- Ensure transitions are smooth and the tone remains consistent with the original analysis.
- The goal is to enhance the existing thematic explanations, not to replace them or add entirely new sections.

ORIGINAL THEMATIC ANALYSIS:
${analysisResult}

WEB-SOURCED INFORMATION (Array of objects, each with 'themeName', 'webSummary', 'sources'):
${JSON.stringify(webEnrichmentContent, null, 2)}

Provide the complete, integrated analysis. If a theme in the original analysis does not have corresponding web enrichment, it should remain unchanged.`;

        const integrationRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are an expert content editor, skilled at seamlessly integrating supplementary information into existing texts while maintaining flow and tone." },
                    { role: "user", content: integrationPrompt }
                ],
                temperature: 0.3,
                max_tokens: 4000 
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

    // 13) Generate Markdown formatted newsletter
    let markdownNewsletter = "";
    try {
      logStep("Starting 'Chain of Thought' markdown newsletter formatting");
      const markdownSystemPrompt = `You are a professional newsletter editor specializing in creating the "Chain of Thought" newsletter for LetterNest. Your job is to take a pre-analyzed thematic content (which includes a hook, main themes, and noteworthy sidetracks) and format it into a beautiful, professional, visually appealing, and well-structured Markdown newsletter.

NEWSLETTER STRUCTURE: "Chain of Thought"

1.  **HEADER:**
    *   Newsletter Title (H1): "Chain of Thought"
    *   Date (H3 or Subtitle): e.g., "Insights for the week of [Current Date]" (You can generate a simple date like "October 26, 2023")
    *   A subtle horizontal rule.

2.  **INTRODUCTION:**
    *   The provided "HOOK" from the analysis, presented as an engaging introductory paragraph.

3.  **MAIN THEMATIC SECTIONS (Based on "MAIN THEMES" from analysis):**
    *   For each main theme:
        *   Section Title (H2): Use the "Theme Title" from the analysis (e.g., "## The Evolving Landscape of X").
        *   "The Gist" (Blockquote or emphasized paragraph): Present the gist of the theme.
        *   "Key Insights" (Bulleted list): Present the synthesized bullet points.
        *   "Deeper Dive" (Regular text): Present the detailed explanation. If this section includes integrated web content (e.g., under a "Broader Context Online" sub-heading from the integration step), ensure it flows naturally.
        *   If a "RepresentativeImageURL" was provided for this theme and seems genuinely high-quality and relevant, include it here. Size appropriately.
        *   Add a subtle horizontal rule or extra spacing before the next main theme.

4.  **NOTEWORTHY SIDETRACKS (Based on "NOTEWORTHY SIDETRACKS" from analysis):**
    *   Section Title (H2): "## Noteworthy Sidetracks" or "## Also On Our Radar"
    *   For each sidetrack:
        *   Sub-section Title (H3): Use the "Sidetrack Title" from the analysis.
        *   "Quick Take" (Regular text): Present the summary.

5.  **FOOTER:**
    *   A clear horizontal rule.
    *   "Generated by LetterNest."
    *   Optional: "Manage your preferences or unsubscribe [link placeholder]." (You don't need to create the link).

FORMATTING GUIDELINES:
- Use clean Markdown (H1, H2, H3, lists, blockquotes, bold, italics).
- Ensure generous white space for readability.
- The tone should be professional, insightful, and engaging, reflecting the "Chain of Thought" concept.
- Avoid overly complex Markdown that might not render well in all email clients.
- **Crucially, do not invent content. Only format the provided analysis.**
- If the analysis provides an image URL for a theme, use it. Otherwise, no images for that theme. Max 1-2 images for the entire newsletter, only if they are high quality and broadly representative.

OUTPUT:
Provide ONLY the formatted Markdown content.`;
      
      const markdownUserPrompt = `I have the thematic analysis for our "Chain of Thought" newsletter. Please format this into a professional and visually appealing Markdown newsletter, following the structure and guidelines provided in the system prompt.

The analysis includes a HOOK, MAIN THEMES (each with Title, Gist, Key Insights, Deeper Dive, and optional RepresentativeImageURL), and NOTEWORTHY SIDETRACKS (each with Title and Quick Take).

Format this into the "Chain of Thought" newsletter for LetterNest.
Current Date for newsletter: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

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
            temperature: 0.2,
            max_tokens: 4000
          })
        });
        
        if (markdownOpenaiRes.ok) {
          const markdownJson = await markdownOpenaiRes.json();
          markdownNewsletter = markdownJson.choices[0].message.content;
          logStep("'Chain of Thought' Markdown newsletter generated successfully");
        } else {
          const errorText = await markdownOpenaiRes.text();
          console.error(`Markdown formatting OpenAI error (${markdownOpenaiRes.status}):`, errorText);
          markdownNewsletter = `Error: Unable to generate 'Chain of Thought' markdown. Original analysis:\n${finalAnalysisForMarkdown}`;
        }
      } catch (markdownError) {
        console.error("Error in markdown formatting API call:", markdownError);
        markdownNewsletter = `Error: API error during markdown generation. Original analysis:\n${finalAnalysisForMarkdown}`;
      }
    } catch (err) {
      console.error("Error generating Markdown newsletter:", err);
      markdownNewsletter = `Error: Failed to generate markdown. Original analysis:\n${finalAnalysisForMarkdown}`;
    }

    // 14) Generate Enhanced Markdown with UI/UX improvements
    let enhancedMarkdownNewsletter = markdownNewsletter;
    try {
      logStep("Generating enhanced UI/UX markdown for 'Chain of Thought'");
      const enhancedSystemPrompt = `
You are a newsletter UI/UX specialist and markdown designer. Your goal is to take well-structured newsletter markdown (for "Chain of Thought" by LetterNest) and output a single, **visually enhanced** markdown document that:

1. **Section headers** (H1, H2, H3) use inline styles or HTML spans for subtle, professional colored accents (e.g., a deep blue like \`<span style="color:#1a0dab;">\`, or a sophisticated grey). Choose one primary accent color.
2. **Spacing & layout:**
   - Ensure one blank line before and after headings, lists, and callout boxes/blockquotes.
   - Use padded \`<div style="background:#f8f9fa; padding:15px; border-radius:5px; margin-bottom:15px;">\` for blockquotes or key summary sections like "The Gist" to make them stand out subtly.
   - Prioritize a clean, uncluttered, professional, and visually appealing structure.
3. **Lists:** Ensure bullet points are well-spaced.
4. **Color scheme hints (subtle):**
   - Main Accent Color for headers.
   - Light background for callouts/divs as mentioned above.
   - Text color should remain highly readable (e.g., #333333 or black).
5. **Tone & writing:**
   - The input markdown is already written. Your job is **visual enhancement and styling only.** Do not alter the substantive content, wording, or structure provided.
   - Ensure any added HTML/CSS is email-client friendly.
6. **Exclusions:** No table of contents, no page breaks.

Produce valid markdown with these inline HTML/CSS enhancements, ready for email.
The primary goal is visual polish and readability.
`;
      
      const enhancedUserPrompt = `
I'm sharing the "Chain of Thought" newsletter markdown below. Please transform it into a **visually enhanced**, user-friendly markdown newsletter using inline HTML/CSS for styling as per the system prompt.

- Focus on subtle color accents for headers (e.g., H1, H2, H3).
- Use styled \`<div>\` blocks for emphasis on sections like "The Gist" or blockquotes.
- Ensure excellent spacing and readability.
- **Do not change the content or the core markdown structure.** Only add styling.

Here is the "Chain of Thought" markdown draft:

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
            temperature: 0.3,
            max_tokens: 4090
          })
        });
        
        if (enhancedOpenaiRes.ok) {
          const enhancedJson = await enhancedOpenaiRes.json();
          enhancedMarkdownNewsletter = enhancedJson.choices[0].message.content;
          logStep("Enhanced UI/UX markdown for 'Chain of Thought' generated successfully");
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
      let firstContentLine = 0;
      for(let i=0; i < lines.length; i++) {
        if(lines[i].trim() !== "") {
          if (!lines[i].trim().startsWith("#")) {
            const headingMatch = cleaned.match(/(^|\n)(#+\s.*)/);
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
    renderer.image = (href, _title, alt) => `
      <div style="text-align:center; margin-top: 10px; margin-bottom: 20px;">
        <img src="${href}"
             alt="${alt || 'Newsletter image'}"
             style="max-width:100%; width:auto; max-height:400px; height:auto; border-radius:6px; display:inline-block; border: 1px solid #eee;">
      </div>`;

    const htmlBody = marked(finalMarkdown, { renderer });

    const emailHtml = juice(`
      <body style="background-color:#f0f2f5; margin:0; padding:0; -webkit-text-size-adjust:100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f2f5;">
          <tr><td align="center" style="padding:20px 0;">
            <table width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; margin:0 auto; background-color:#ffffff; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
              <tr><td style="padding:30px 35px; line-height:1.6; color:#333333; font-size:16px;">
                ${htmlBody}
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center" style="padding:20px 0 30px 0; font-size:12px; color:#777777;">
            Powered by LetterNest<br>
          </td></tr>
        </table>
      </body>
    `);
    
    logStep("Converted 'Chain of Thought' markdown to HTML with inline CSS");

    // 17) Send email via Resend - FIXED email domain
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@letternest.com"; // FIXED: Use proper domain
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
      // Continue with saving to database even if email fails
    }

    // 18) Save the newsletter to newsletter_storage table - FIXED column name
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({
        user_id: userId,
        markdown_text: finalMarkdown // FIXED: Use existing column name
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
    logStep("'Chain of Thought' newsletter generation successful", {
      userId,
      timestamp,
      tweetCount: selectedCount,
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
      message: error.message || "Internal server error during 'Chain of Thought' generation"
    };
  }
}

// Main serve function that handles the HTTP request
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    logStep("Starting 'Chain of Thought' newsletter generation process");
    
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
    }), {
      status: 202, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
