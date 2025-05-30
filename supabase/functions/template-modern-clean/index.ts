// =========================================================================================
//  manual-newsletter-generation.ts — FULL PRODUCTION VERSION
//  (includes Perplexity enrichment, query-generation, UI/UX enhancer, HTML conversion, etc.)
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
    `&user.fields=name,username,profile_image_url`,
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
  // │ 5. Format tweets for OpenAI                                             │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  const tweetsForAI = formatTweetsForAI(apifyData);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 6. OpenAI – analysis JSON                                               │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("OpenAI analysis");
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) { console.error("Missing OPENAI_KEY"); return; }

  const analysisPrompt = buildAnalysisPrompt(selectedCount, tweetsForAI);
  const analysisJson = await chat(OPENAI_KEY, "gpt-4o-mini", 0.7, 2000,
    "You are an expert content analyst specializing in social media content curation and newsletter creation.",
    analysisPrompt
  );
  let analysisContent = analysisJson.choices[0].message.content.trim();
  // remove ```json fences if present
  analysisContent = analysisContent.replace(/```json\n?/, "").replace(/```$/, "");

  let analysisParsed: any;
  try { analysisParsed = JSON.parse(analysisContent); }
  catch {
    console.warn("Failed to parse analysis JSON – using fallback skeleton");
    analysisParsed = {
      mainTopics: ["Topic A", "Topic B", "Topic C"],
      keyInsights: ["Insight 1", "Insight 2"],
      contentSummary: "Summary...",
      recommendedSections: []
    };
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 7. Query-generation → Perplexity enrichment → Integration               │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Generating search queries for Perplexity");
  const queryGenPrompt = buildQueryGenPrompt(analysisContent);
  const queryJson = await chat(OPENAI_KEY, "gpt-4o-mini", 0.3, 800,
    "You are a search-query optimisation specialist.",
    queryGenPrompt
  );
  const queryText = queryJson.choices[0].message.content.trim();

  const parsedQueries: { topic: string; query: string; goal: string }[] = [];
  const re = /TOPIC \d+:\s*(.+?)\s*QUERY:\s*(.+?)\s*ENRICHMENT GOAL:\s*(.+?)(?=\n\s*TOPIC \d+:|$)/gis;
  let m; while ((m = re.exec(queryText)) !== null) {
    parsedQueries.push({ topic: m[1].trim(), query: m[2].trim(), goal: m[3].trim() });
  }

  const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  const enrichmentResults: any[] = [];
  if (PERPLEXITY_KEY) {
    logStep("Perplexity enrichment", { count: parsedQueries.length });
    for (const topic of parsedQueries) {
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
              messages: [ { role: "user", content: topic.query } ],
              temperature: 0.2,
              max_tokens: 350,
              search_recency_filter: "week"
            })
          }
        );
        if (pRes.ok) {
          const pJson = await pRes.json();
          enrichmentResults.push({
            topic: topic.topic,
            query: topic.query,
            goal:  topic.goal,
            webContent: pJson.choices[0].message.content,
            sources:    pJson.citations ?? []
          });
        } else {
          enrichmentResults.push({ ...topic, webContent: `[Error ${pRes.status}]`, sources: [] });
        }
      } catch (err) {
        enrichmentResults.push({ ...topic, webContent: "[Request failed]", sources: [] });
      }
    }
  } else {
    logStep("No PERPLEXITY_API_KEY – skipping web enrichment");
  }

  // Integration step
  logStep("Integrating web enrichment");
  const integrationPrompt = buildIntegrationPrompt(analysisContent, enrichmentResults);
  const integrationJson = await chat(OPENAI_KEY, "gpt-4o-mini", 0.3, 4000,
    "You integrate web-sourced information into existing analyses seamlessly.",
    integrationPrompt
  );
  const integratedAnalysis = integrationJson.choices[0].message.content.trim();

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 8. OpenAI – initial markdown newsletter                                 │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Generating newsletter markdown");
  const newsletterPrompt = buildNewsletterPrompt(integratedAnalysis, tweetsForAI);
  const markdownJson = await chat(OPENAI_KEY, "gpt-4o-mini", 0.2, 4000,
    "You are a professional newsletter editor who formats content into clean, beautiful markdown.",
    newsletterPrompt
  );
  let markdownNewsletter = markdownJson.choices[0].message.content.trim();
  markdownNewsletter = markdownNewsletter.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 9. UI/UX enhancement pass (markdown → enhanced markdown)                │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Enhancing UI/UX markdown");
  const enhancedPrompt = buildEnhancedPrompt(markdownNewsletter);
  const enhancedJson = await chat(OPENAI_KEY, "gpt-4o-mini", 0.4, 4000,
    "You are a newsletter UI/UX specialist and markdown designer.",
    enhancedPrompt
  );
  let enhancedMarkdown = enhancedJson.choices[0].message.content.trim();
  enhancedMarkdown = enhancedMarkdown.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 10. Markdown → responsive HTML                                          │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Converting markdown → HTML");
  const emailHtml = markdownToHtml(enhancedMarkdown);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 11. Store in newsletter_storage                                         │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Storing newsletter");
  const { data: stored, error: storeErr } = await supabase
    .from("newsletter_storage")
    .insert({
      user_id:      userId,
      markdown_text: enhancedMarkdown,
      html_text:     emailHtml
    })
    .select()
    .single();
  if (storeErr) console.error("Storage error", storeErr);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 12. Decrement remaining generations                                     │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  await supabase
    .from("profiles")
    .update({ remaining_newsletter_generations: profile.remaining_newsletter_generations - 1 })
    .eq("id", userId);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 13. Send email via Resend                                               │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  if (profile.sending_email) {
    try {
      logStep("Sending email");
      await resend.emails.send({
        from:    Deno.env.get("FROM_EMAIL") || "Letternest <newsletters@letternest.com>",
        to:      [profile.sending_email],
        subject: `Your Newsletter • ${new Date().toLocaleDateString()}`,
        html:    emailHtml,
        text:    enhancedMarkdown
      });
      logStep("Email sent");
    } catch (err) {
      console.error("Resend error", err);
    }
  }

  logStep("Background task complete", { storedId: stored?.id });
}

// ────────────────────────────────────────────────────────────────────────────────
//  Utility: standard JSON Response
// ────────────────────────────────────────────────────────────────────────────────
function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// ────────────────────────────────────────────────────────────────────────────────
//  Helper: format tweets for OpenAI
// ────────────────────────────────────────────────────────────────────────────────
function formatTweetsForAI(arr: any[]): string {
  let out = "";
  arr.forEach((t, i) => {
    const cleanText = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
    const date = new Date(t.createdAt).toISOString().split("T")[0];
    const photo = t.extendedEntities?.media?.find((m: any) => m.type === "photo")?.media_url_https;
    out += `Tweet ${i + 1}
Tweet ID: ${t.id}
Tweet text: ${cleanText}
ReplyAmount: ${t.replyCount || 0}
LikesAmount: ${t.likeCount || 0}
Impressions: ${t.viewCount || 0}
Date: ${date}
Tweet Author: ${t.author?.name || "Unknown"}
PhotoUrl: ${photo || "N/A"}
`;
    if (i < arr.length - 1) out += "\n---\n\n";
  });
  return out;
}

// ────────────────────────────────────────────────────────────────────────────────
//  Helper: OpenAI chat wrapper
// ────────────────────────────────────────────────────────────────────────────────
async function chat(apiKey: string, model: string,
                    temperature: number, max_tokens: number,
                    systemMsg: string, userMsg: string) {
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
        { role: "user",   content: userMsg   }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return res.json();
}

// ────────────────────────────────────────────────────────────────────────────────
//  Helper: build prompts
// ────────────────────────────────────────────────────────────────────────────────
function buildAnalysisPrompt(count: number, tweets: string) {
  return `You are an expert content analyst. Analyze these ${count} bookmarked tweets and create a comprehensive newsletter.\n\nTWEETS:\n${tweets}\n\nReturn JSON with mainTopics, keyInsights, trendingThemes, contentSummary, recommendedSections.`;
}

function buildQueryGenPrompt(analysis: string) {
  return `Select the 3 most significant topics from this analysis and craft search queries.\n\n${analysis}`;
}

function buildIntegrationPrompt(analysis: string, enrichment: any[]) {
  return `Integrate the following web content into the existing analysis.\n\nORIGINAL ANALYSIS:\n${analysis}\n\nWEB CONTENT:\n${JSON.stringify(enrichment, null, 2)}\n\nReturn the fully integrated analysis.`;
}

function buildNewsletterPrompt(integrated: string, tweets: string) {
  return `Create a beautifully formatted markdown newsletter (Modern Clean style) using this integrated analysis and the underlying tweets.\n\nANALYSIS:\n${integrated}\n\nTWEETS:\n${tweets}`;
}

function buildEnhancedPrompt(rawMarkdown: string) {
  return `Improve this markdown newsletter’s UI/UX: better spacing, color accents via inline spans, centered images, callout boxes, etc., but keep content unchanged.\n\n${rawMarkdown}`;
}

// ────────────────────────────────────────────────────────────────────────────────
//  Helper: markdown → responsive HTML
// ────────────────────────────────────────────────────────────────────────────────
function markdownToHtml(md: string): string {
  const renderer = new marked.Renderer();
  renderer.image = (href, _title, alt) => `
    <div style="text-align:center;">
      <img src="${href}" alt="${alt}"
           style="max-width:400px;width:100%;height:auto;border-radius:4px;display:inline-block;">
    </div>`;
  const html = marked(md, { renderer });
  return juice(`
    <body style="background:#f5f7fa;margin:0;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:6px;overflow:hidden;">
        <div style="padding:24px;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#222;">
          ${html}
        </div>
      </div>
    </body>
  `);
}
