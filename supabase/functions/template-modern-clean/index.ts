// =========================================================================================
//  fixed-newsletter-generation.ts — CLEAN MARKDOWN OUTPUT VERSION
//  (outputs clean markdown that renders properly, no raw HTML dumps)
// =========================================================================================

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked }       from "https://esm.sh/marked@4.3.0";
import  juice           from "https://esm.sh/juice@11.0.0";
import { Resend }       from "npm:resend@2.0.0";

// ────────────────────────────────────────────────────────────────────────────────
//  CORS
// ────────────────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

// ────────────────────────────────────────────────────────────────────────────────
//  RESEND INITIALISATION
// ────────────────────────────────────────────────────────────────────────────────
const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");

// ────────────────────────────────────────────────────────────────────────────────
//  LOGGING HELPER
// ────────────────────────────────────────────────────────────────────────────────
const logStep = (step: string, details?: any) => {
  console.log(
    `[NEWSLETTER] ${step}${details ? ` – ${JSON.stringify(details, null, 2)}` : ""}`
  );
};

// ────────────────────────────────────────────────────────────────────────────────
//  MAIN EDGE SERVE HANDLER
// ────────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ░░ Parse body
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return json(400, { error: "Invalid selectedCount; must be 10, 20, or 30." });
    }

    // ░░ Auth header → JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing Authorization header" });
    const jwt = authHeader.replace("Bearer ", "");

    // ░░ Supabase client (service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase    = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return json(401, { error: "Invalid token" });

    // ░░ Fire off background task
    const task = generateNewsletter(user.id, selectedCount, jwt);
    // @ts-ignore – EdgeRuntime global exists in Deno Deploy
    EdgeRuntime.waitUntil(task);

    return json(202, { status: "processing", message: "Newsletter generation started" });

  } catch (err) {
    console.error("Top-level error", err);
    return json(500, { error: "Internal error" });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
//  BACKGROUND NEWSLETTER GENERATION
// ────────────────────────────────────────────────────────────────────────────────
async function generateNewsletter(userId: string, selectedCount: number, jwt: string) {
  logStep("Background task start", { userId, selectedCount });

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 1. Supabase profile + plan validation                                   │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  const supabaseUrl  = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase     = createClient(supabaseUrl, supabaseKey);

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select(`subscription_tier,
             remaining_newsletter_generations,
             twitter_bookmark_access_token,
             twitter_bookmark_refresh_token,
             twitter_bookmark_token_expires_at,
             numerical_id,
             twitter_handle,
             sending_email,
             newsletter_content_preferences`)
    .eq("id", userId)
    .single();

  if (profErr || !profile) {
    console.error("Profile error", profErr);
    return;
  }

  if (!profile.remaining_newsletter_generations ||
       profile.remaining_newsletter_generations <= 0) {
    console.error("No remaining generations");
    return;
  }

  if (!profile.twitter_bookmark_access_token) {
    console.error("Twitter not connected");
    return;
  }

  if (profile.twitter_bookmark_token_expires_at &&
      profile.twitter_bookmark_token_expires_at < Math.floor(Date.now()/1000)) {
    console.error("Twitter token expired");
    return;
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 2. Ensure numerical_id                                                  │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  let twitterId: string = profile.numerical_id;
  if (!twitterId && profile.twitter_handle) {
    try {
      const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
      if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY");

      const handle = profile.twitter_handle.replace("@", "").trim();
      const r = await fetch(
        `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(handle)}`,
        { headers: { "x-rapidapi-key": RAPIDAPI_KEY, "x-rapidapi-host": "twitter293.p.rapidapi.com" } }
      );

      if (!r.ok) throw new Error(`RapidAPI ${r.status}`);
      const j = await r.json();
      twitterId = j?.user?.result?.rest_id;
      if (!twitterId) throw new Error("No rest_id");

      await supabase.from("profiles").update({ numerical_id: twitterId }).eq("id", userId);
    } catch (err) {
      console.error("Twitter ID fetch error", err);
      return;
    }
  }
  if (!twitterId) {
    console.error("Missing twitterId");
    return;
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 3. Twitter API → bookmarks                                              │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Fetching bookmarks");
  const twRes = await fetch(
    `https://api.twitter.com/2/users/${twitterId}/bookmarks` +
    `?max_results=${selectedCount}&expansions=author_id,attachments.media_keys` +
    `&tweet.fields=created_at,text,public_metrics,entities` +
    `&user.fields=name,username,profile_image_url` +
    `&media.fields=preview_image_url,url,variants`,
    { headers: { Authorization: `Bearer ${profile.twitter_bookmark_access_token}` } }
  );
  if (!twRes.ok) {
    console.error("Twitter API error", twRes.status, await twRes.text());
    return;
  }
  const twJson = await twRes.json();
  const tweetIds = twJson?.data?.map((t: any) => t.id) ?? [];
  if (!tweetIds.length) {
    console.error("No bookmarks");
    return;
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 4. Apify detailed tweet data                                            │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Apify scrape");
  const APIFY_KEY = Deno.env.get("APIFY_API_KEY");
  if (!APIFY_KEY) { console.error("Missing APIFY_KEY"); return; }

  const apifyRes = await fetch(
    `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: "en", maxItems: selectedCount, tweetIDs: tweetIds })
    }
  );
  if (!apifyRes.ok) {
    console.error("Apify error", apifyRes.status, await apifyRes.text());
    return;
  }
  const apifyData = await apifyRes.json();

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 5. Format tweets for analysis                                           │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  const tweetsForAI = formatTweetsForAnalysis(apifyData);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 6. OpenAI – comprehensive analysis                                      │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("OpenAI analysis");
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) { console.error("Missing OPENAI_KEY"); return; }

  const analysisPrompt = buildAnalysisPrompt(selectedCount, tweetsForAI);
  const analysisJson = await chat(OPENAI_KEY, "gpt-4o", 0.3, 4000,
    "You are a strategic business analyst who creates comprehensive intelligence reports from social media content.",
    analysisPrompt
  );
  let analysisContent = analysisJson.choices[0].message.content.trim();
  
  // Strip markdown code blocks if present
  analysisContent = analysisContent.replace(/^```json\n?/gm, "").replace(/\n?```$/gm, "");

  let analysisParsed: any;
  try { 
    analysisParsed = JSON.parse(analysisContent); 
  } catch (parseErr) {
    console.warn("Failed to parse analysis JSON – using fallback", parseErr);
    analysisParsed = {
      executiveSummary: "Analysis of curated social media content...",
      keyThemes: []
    };
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 7. Strategic research via Perplexity                                   │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Strategic research");
  const queryGenPrompt = buildQueryPrompt(analysisContent);
  const queryJson = await chat(OPENAI_KEY, "gpt-4o", 0.2, 1000,
    "You generate strategic research queries.",
    queryGenPrompt
  );
  const queryText = queryJson.choices[0].message.content.trim();

  const parsedQueries: { topic: string; query: string; goal: string }[] = [];
  const re = /QUERY \d+:\s*(.+?)\s*SEARCH:\s*(.+?)\s*PURPOSE:\s*(.+?)(?=\n\s*QUERY \d+:|$)/gis;
  let m; while ((m = re.exec(queryText)) !== null) {
    parsedQueries.push({ topic: m[1].trim(), query: m[2].trim(), goal: m[3].trim() });
  }

  const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  const enrichmentResults: any[] = [];
  if (PERPLEXITY_KEY && parsedQueries.length > 0) {
    logStep("Perplexity research", { count: parsedQueries.length });
    for (const research of parsedQueries.slice(0, 3)) { // Limit to 3 queries
      try {
        const pRes = await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${PERPLEXITY_KEY}`,
              "Content-Type":  "application/json"
            },
            body: JSON.stringify({
              model: "sonar-pro",
              messages: [ { role: "user", content: research.query } ],
              temperature: 0.1,
              max_tokens: 400,
              search_recency_filter: "week"
            })
          }
        );
        if (pRes.ok) {
          const pJson = await pRes.json();
          enrichmentResults.push({
            topic: research.topic,
            content: pJson.choices[0].message.content,
            sources: pJson.citations ?? []
          });
        }
      } catch (err) {
        console.warn("Perplexity error for query:", research.topic, err);
      }
    }
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 8. Generate clean newsletter markdown                                   │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Generating newsletter");
  const newsletterPrompt = buildNewsletterPrompt(analysisContent, enrichmentResults, tweetsForAI);
  const newsletterJson = await chat(OPENAI_KEY, "gpt-4o", 0.2, 6000,
    "You are a premium newsletter writer who creates sophisticated, information-dense business intelligence reports. Output ONLY clean markdown - no HTML, no code blocks, no technical formatting.",
    newsletterPrompt
  );
  
  let newsletterMarkdown = newsletterJson.choices[0].message.content.trim();
  
  // Ensure clean markdown output - strip any code block markers
  newsletterMarkdown = newsletterMarkdown.replace(/^```[^\n]*\n?/gm, "").replace(/\n?```$/gm, "");
  
  // Validate the output is actual newsletter content, not code
  if (newsletterMarkdown.includes("<!DOCTYPE") || newsletterMarkdown.includes("<html") || newsletterMarkdown.includes("<body")) {
    console.error("Generated HTML instead of markdown - fixing");
    // If HTML was generated, create a simple fallback newsletter
    newsletterMarkdown = createFallbackNewsletter(analysisParsed, tweetsForAI);
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 9. Convert to HTML for email only                                       │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  const emailHtml = convertToEmailHtml(newsletterMarkdown);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 10. Store CLEAN markdown in database                                    │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Storing newsletter");
  const { data: stored, error: storeErr } = await supabase
    .from("newsletter_storage")
    .insert({
      user_id: userId,
      markdown_text: newsletterMarkdown  // Store the CLEAN markdown
    })
    .select()
    .single();
  
  if (storeErr) console.error("Storage error", storeErr);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 11. Decrement remaining generations                                     │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  await supabase
    .from("profiles")
    .update({ remaining_newsletter_generations: profile.remaining_newsletter_generations - 1 })
    .eq("id", userId);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 12. Send email if requested                                             │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  if (profile.sending_email) {
    try {
      logStep("Sending email");
      await resend.emails.send({
        from: Deno.env.get("FROM_EMAIL") || "Chirpmetrics <newsletters@chirpmetrics.com>",
        to: [profile.sending_email],
        subject: `Intelligence Brief • ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
        html: emailHtml,
        text: newsletterMarkdown
      });
      logStep("Email sent successfully");
    } catch (err) {
      console.error("Email send error", err);
    }
  }

  logStep("Newsletter generation complete", { storedId: stored?.id });
}

// ────────────────────────────────────────────────────────────────────────────────
//  Utility functions
// ────────────────────────────────────────────────────────────────────────────────
function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function formatTweetsForAnalysis(arr: any[]): string {
  return arr.map((t, i) => {
    const cleanText = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
    const authorName = t.author?.name || t.user?.name || "Unknown";
    const authorHandle = t.author?.username || t.user?.screen_name || "unknown";
    const engagement = (t.likeCount || 0) + (t.retweetCount || 0) + (t.replyCount || 0);
    
    return `Tweet ${i + 1}:
Author: ${authorName} (@${authorHandle})
Content: ${cleanText}
Engagement: ${t.likeCount || 0} likes, ${t.retweetCount || 0} retweets, ${t.replyCount || 0} replies
Date: ${new Date(t.createdAt).toISOString().split("T")[0]}
Images: ${t.extendedEntities?.media?.filter((m: any) => m.type === "photo").length || 0}`;
  }).join("\n\n---\n\n");
}

async function chat(apiKey: string, model: string, temperature: number, max_tokens: number, systemMsg: string, userMsg: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return res.json();
}

function buildAnalysisPrompt(count: number, tweets: string) {
  return `Analyze these ${count} tweets and create strategic business intelligence.

TWEETS:
${tweets}

Return JSON analysis:
{
  "executiveSummary": "2-3 sentence high-level summary",
  "keyThemes": [
    {
      "theme": "Theme name",
      "description": "Detailed explanation", 
      "businessImplications": "What this means for business",
      "supportingTweets": ["tweet excerpts"]
    }
  ],
  "marketSignals": ["significant trends or developments"],
  "actionableInsights": ["specific recommendations for business leaders"],
  "topAuthors": [
    {
      "name": "Author name",
      "handle": "@username", 
      "keyInsight": "Their most important contribution"
    }
  ]
}`;
}

function buildQueryPrompt(analysis: string) {
  return `Based on this analysis, create 3 strategic research queries to get current market context.

ANALYSIS:
${analysis}

Format as:
QUERY 1: [Topic]
SEARCH: [specific search query for current information]
PURPOSE: [what strategic insight this provides]

QUERY 2: [Topic] 
SEARCH: [specific search query]
PURPOSE: [strategic insight]

QUERY 3: [Topic]
SEARCH: [specific search query] 
PURPOSE: [strategic insight]`;
}

function buildNewsletterPrompt(analysis: string, research: any[], tweets: string) {
  return `Create a premium business newsletter from this analysis and research. 

REQUIREMENTS:
- Professional, information-dense content suitable for executives
- Clear structure with strategic insights
- Include specific examples and data points
- Use markdown formatting (headers, lists, quotes, emphasis)
- Include relevant images if available in tweets
- 800-1200 words of substantive analysis

ANALYSIS:
${analysis}

ADDITIONAL RESEARCH:
${JSON.stringify(research, null, 2)}

ORIGINAL TWEETS:
${tweets}

Create a newsletter with this structure:

# Intelligence Brief • [Date]

## Executive Summary
[Critical insights in 2-3 sentences]

## Strategic Analysis

### [Primary Theme]
[Dense analysis with specific examples and implications]

### [Secondary Theme] 
[Focused analysis with market context]

## Market Intelligence
[Key developments and their business impact]

## Expert Perspectives
[Notable insights from credible sources with attribution]

## Strategic Implications
[Actionable recommendations for business leaders]

## What's Next
[Forward-looking analysis and monitoring points]

---

*Intelligence curated from [X] sources • Generated by Chirpmetrics*

Output ONLY the newsletter content in clean markdown. No code blocks, no HTML, no technical formatting.`;
}

function createFallbackNewsletter(analysis: any, tweets: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `# Intelligence Brief • ${today}

## Executive Summary

${analysis.executiveSummary || "Analysis of curated social media content reveals key market trends and strategic developments requiring business attention."}

## Strategic Analysis

### Key Market Developments

Based on analysis of curated content, several significant trends are emerging that warrant strategic consideration by business leaders.

### Industry Insights

The collected intelligence points to evolving market dynamics that could impact organizational planning and competitive positioning.

## Expert Perspectives

Notable thought leaders in the analyzed content are highlighting important developments across multiple sectors.

## Strategic Implications

Organizations should monitor these trends closely as they may influence near-term business decisions and strategic planning initiatives.

## Next Steps

Continued monitoring of these indicators will provide valuable intelligence for strategic decision-making.

---

*Intelligence brief generated from curated social media analysis • Powered by Chirpmetrics*`;
}

function convertToEmailHtml(markdown: string): string {
  const html = marked(markdown);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Intelligence Brief</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    h3 { color: #4a5568; }
    blockquote { 
      border-left: 4px solid #4299e1; 
      margin: 20px 0; 
      padding-left: 20px; 
      background: #f7fafc; 
      padding: 15px 20px; 
    }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}
