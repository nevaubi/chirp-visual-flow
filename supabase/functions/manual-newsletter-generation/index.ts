// ============================================================================
// Supabase Edge Function: manual-newsletter-generation.ts
// (reply-analysis removed – everything else unchanged)
// ============================================================================

// deno run --allow-net --allow-env
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@4.3.0";
import juice from "https://esm.sh/juice@11.0.0";
import { Resend } from "npm:resend@2.0.0";

// ----------------------------------------------------------------------------
// Shared config
// ----------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ----------------------------------------------------------------------------
// Boot Resend client
// ----------------------------------------------------------------------------
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// ----------------------------------------------------------------------------
// Helper – Twitter → OpenAI-friendly block
// ----------------------------------------------------------------------------
function tweetsToPromptBlock(data: any[]): string {
  return data
    .map((t, i) => {
      const txt = String(t.text ?? "").replace(/https?:\/\/\S+/g, "").trim();
      const date = (() => {
        try {
          return new Date(t.createdAt).toISOString().split("T")[0];
        } catch {
          return "N/A";
        }
      })();
      const photo =
        t.extendedEntities?.media?.find((m: any) => m.type === "photo")?.media_url_https ??
        "N/A";

      return `Tweet ${i + 1}
Tweet ID: ${t.id}
Tweet text: ${txt}
ReplyAmount: ${t.replyCount ?? 0}
LikesAmount: ${t.likeCount ?? 0}
Impressions: ${t.viewCount ?? 0}
Date: ${date}
Tweet Author: ${t.author?.name ?? "Unknown"}
PhotoUrl: ${photo}`;
    })
    .join("\n---\n\n");
}

// ----------------------------------------------------------------------------
// Edge entry
// ----------------------------------------------------------------------------
serve(async (req) => {
  // CORS pre-flight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ──────────────────────────────────────────────────────────
    // 1) Parse body
    // ──────────────────────────────────────────────────────────
    const { selectedCount } = await req.json();
    if (![10, 20, 30].includes(selectedCount)) {
      return new Response(
        JSON.stringify({ error: "Invalid selection. Choose 10, 20, or 30 tweets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ──────────────────────────────────────────────────────────
    // 2) Auth
    // ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────
    // 3) Get profile
    // ──────────────────────────────────────────────────────────
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select(
        "subscription_tier, remaining_newsletter_generations, sending_email, " +
          "twitter_bookmark_access_token, twitter_bookmark_token_expires_at, " +
          "numerical_id, twitter_handle",
      )
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.subscription_tier) {
      return new Response(JSON.stringify({ error: "No active subscription" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.remaining_newsletter_generations) {
      return new Response(JSON.stringify({ error: "No generations left" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.twitter_bookmark_access_token) {
      return new Response(JSON.stringify({
        error: "Twitter bookmark access not authorized. Connect in settings.",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (
      profile.twitter_bookmark_token_expires_at &&
      profile.twitter_bookmark_token_expires_at < nowSec
    ) {
      return new Response(JSON.stringify({ error: "Twitter bookmark token expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────
    // 4) Ensure numerical_id (RapidAPI if missing)
    // ──────────────────────────────────────────────────────────
    let numericalId: string | null = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
      if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY");

      const resp = await fetch(
        `https://twitter293.p.rapidapi.com/user/by/username/${profile.twitter_handle.replace("@", "")}`,
        {
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "twitter293.p.rapidapi.com",
          },
        },
      );
      if (resp.ok) {
        const j = await resp.json();
        numericalId = j?.user?.result?.rest_id ?? null;
        if (numericalId) {
          await supabase.from("profiles").update({ numerical_id: numericalId }).eq("id", user.id);
        }
      }
    }

    if (!numericalId) {
      return new Response(JSON.stringify({ error: "Unable to determine Twitter ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────
    // 5) Fetch bookmarks via X API
    // ──────────────────────────────────────────────────────────
    const bookmarksUrl =
      `https://api.twitter.com/2/users/${numericalId}/bookmarks` +
      `?max_results=${selectedCount}` +
      `&expansions=author_id,attachments.media_keys` +
      `&tweet.fields=created_at,text,public_metrics,entities` +
      `&user.fields=name,username,profile_image_url`;

    const bookmarksRes = await fetch(bookmarksUrl, {
      headers: { Authorization: `Bearer ${profile.twitter_bookmark_access_token}` },
    });
    if (!bookmarksRes.ok) throw new Error(`Bookmarks API error ${bookmarksRes.status}`);

    const bookmarksJson = await bookmarksRes.json();
    const tweetIds: string[] = bookmarksJson?.data?.map((t: any) => t.id) ?? [];
    if (!tweetIds.length) {
      return new Response(JSON.stringify({ error: "No bookmarks found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────────────────
    // 6) Scrape full tweet objects via Apify
    // ──────────────────────────────────────────────────────────
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) throw new Error("Missing APIFY_API_KEY");

    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: "en",
          maxItems: selectedCount,
          tweetIDs: tweetIds,
          "filter:blue_verified": false,
          "filter:media": false,
          "filter:replies": false,
        }),
      },
    );
    if (!apifyRes.ok) throw new Error(`Apify error ${apifyRes.status}`);
    const apifyData = await apifyRes.json();
    const tweetsArr = Array.isArray(apifyData) ? apifyData : apifyData.items ?? [];

    // ──────────────────────────────────────────────────────────
    // 7) Build OpenAI prompt block
    // ──────────────────────────────────────────────────────────
    const formattedTweets = tweetsToPromptBlock(tweetsArr);

    // ──────────────────────────────────────────────────────────
    // 8) OpenAI – main topic analysis
    // ──────────────────────────────────────────────────────────
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    const analysisSystemPrompt = `You are a sophisticated tweet analysis system designed to identify key topics, trends, and insights from collections of tweets. Your purpose is to transform raw tweet data into structured, insightful analysis that captures the most significant discussions and themes.

CAPABILITIES:
- Analyze collections of 30-50 tweets to identify main topics and sub-topics
- Recognize patterns, themes, and trending discussions across seemingly unrelated tweets
- Extract sentiment, contextual meaning, and significant data points
- Identify the most relevant visual content from available photo URLs
- Synthesize information into comprehensive summaries while preserving important details
- Format output in a consistent, structured manner that highlights key insights and communicates them at a 10th grade casual speaking level

ANALYSIS METHODOLOGY:
1. Process all tweet data including text, engagement metrics (replies, likes, impressions), timestamps, and authors
2. Identify recurring themes, keywords, hashtags, and discussion topics
3. Prioritize topics based on frequency, engagement metrics, and recency
4. Extract notable quotes that best represent each identified topic
5. Select the most relevant images based on engagement and topical relevance
6. Generate comprehensive and detailed explanations that capture the essence of each topic

OUTPUT REQUIREMENTS:
For each analysis, you will produce a structured report containing:

THREE MAIN TOPICS (highest priority discussions):
- Each with a concise header (10-20 words)
- Four bullet points highlighting the most significant aspects (100 words max each)
- A detailed explanation of approximately 500-700 words covering context, sentiment, key discussions, and notable perspectives
- The best photo url per topic

TWO SUB-TOPICS (next most relevant discussions):
- Concise header (10-20 words)
- Three bullet points highlighting the most significant aspects (40 words max each)
- A comprehensive explanation of approximately 300-400 words providing context and analysis
- A notable quote or significant statement either directly extracted from a tweet or referenced within the tweets
- The best photo url that best represents this topic (if available)

Organization criteria:
- Prioritize topics based on frequency of mention, engagement metrics, and recency
- When selecting the most significant aspects for bullet points, consider uniqueness, engagement, and informational value
- When selecting photo URLs, prioritize images with higher engagement on relevant tweets

Here is the tweet collection to analyze:

${formattedTweets}`;

    const analysisUserPrompt = `Analyze the collection above and produce the report exactly as described.`;

    const analysisOpenAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: analysisSystemPrompt },
          { role: "user", content: analysisUserPrompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });
    if (!analysisOpenAIRes.ok) throw new Error(`OpenAI analysis error ${analysisOpenAIRes.status}`);
    const analysisJson = await analysisOpenAIRes.json();
    const analysisResult: string = analysisJson.choices[0].message.content.trim();

    // ──────────────────────────────────────────────────────────
    // 9) Markdown formatting
    // ──────────────────────────────────────────────────────────
    const markdownSystemPrompt = `You are a professional newsletter editor who formats content into clean, beautiful, visually appealing, well-structured Markdown. Your job is to take text content and format it into a beautiful newsletter that looks professional and is easy to read. Ensure all details from the input content are preserved and comprehensively formatted.

FORMAT GUIDELINES:
- Use proper Markdown syntax for headings, subheadings, bullet points, dividers, and horizontal rules
- Use headings (#, ##, ###) appropriately for hierarchy
- Use bullet points (-) for lists
- Use horizontal rules (---) to separate sections
- Ensure proper spacing between sections
- Maintain the original content and meaning while improving formatting
- Use bold and italic formatting where appropriate for emphasis
- Include photo URLs where provided
- Reword sentences for accessible, natural 9th-grade reading flow

CONTENT STRUCTURE:
1. Main Topic 1 at the top
2. Sub-Topic(s)
3. Main Topic 2, etc.
4. A final horizontal rule
5. Max 2-3 images total

OUTPUT:
Return ONLY the formatted Markdown—no extra commentary.`;

    const markdownUserPrompt =
      `Here is the analysis content. Format it as a polished newsletter Markdown document:\n\n${analysisResult}`;

    const markdownRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: markdownSystemPrompt },
          { role: "user", content: markdownUserPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });
    if (!markdownRes.ok) throw new Error(`OpenAI markdown error ${markdownRes.status}`);
    const markdownJson = await markdownRes.json();
    const markdownNewsletter: string = markdownJson.choices[0].message.content;

    // ──────────────────────────────────────────────────────────
    // 10) UI/UX enhancement pass (optional – keep prompts unchanged)
    // ──────────────────────────────────────────────────────────
    const enhanceSystemPrompt = `You are a newsletter UI/UX specialist and markdown designer. Your goal is to take raw newsletter markdown and output a single, **visually enhanced** markdown document that:

1. Section headers use inline color spans (\`<span style="color:#0073e6">\`)
2. Spacing: blank line before/after headings, lists, callouts
3. Callout boxes: \`<div style="background:#f0f4f6;…">\`
4. Conversational tone, 10th-grade reading level
5. No table of contents, no page numbers
Produce valid markdown ready for email or PDF.`;

    const enhanceUserPrompt =
      `Transform the following markdown into a visually enhanced version:\n\n<current newsletter>\n${markdownNewsletter}\n</current newsletter>`;

    const enhanceRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "chatgpt-4o-latest",
        messages: [
          { role: "system", content: enhanceSystemPrompt },
          { role: "user", content: enhanceUserPrompt },
        ],
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });

    const enhancedMarkdown: string = enhanceRes.ok
      ? (await enhanceRes.json()).choices[0].message.content
      : markdownNewsletter;

    // ──────────────────────────────────────────────────────────
    // 11) Convert to HTML + inline CSS (responsive images)
    // ──────────────────────────────────────────────────────────
    const renderer = new marked.Renderer();
    renderer.image = (href, _title, alt) => `
      <img src="${href}"
           alt="${alt}"
           width="552"
           style="width:100%;max-width:552px;height:auto;display:block;margin:12px auto;border-radius:4px;">`;
    const htmlBody = marked(enhancedMarkdown, { renderer });

    const emailHtml = juice(`
      <body style="background:#f5f7fa;margin:0;padding:20px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:6px;overflow:hidden;">
          <div style="padding:24px;font-family:Arial,sans-serif;line-height:1.6;color:#333;">
            ${htmlBody}
          </div>
        </div>
      </body>`);

    // ──────────────────────────────────────────────────────────
    // 12) Send via Resend
    // ──────────────────────────────────────────────────────────
    try {
      await resend.emails.send({
        from: Deno.env.get("FROM_EMAIL") ?? "newsletter@admin.chirpmetrics.com",
        to: profile.sending_email,
        subject: "Your Newsletter is Here",
        html: emailHtml,
        text: enhancedMarkdown,
      });
    } catch (e) {
      console.error("Resend error:", e);
    }

    // ──────────────────────────────────────────────────────────
    // 13) Persist + decrement counter
    // ──────────────────────────────────────────────────────────
    await supabase.from("newsletter_storage").insert({
      user_id: user.id,
      markdown_text: enhancedMarkdown,
    });

    if (profile.remaining_newsletter_generations > 0) {
      await supabase.from("profiles").update({
        remaining_newsletter_generations: profile.remaining_newsletter_generations - 1,
      }).eq("id", user.id);
    }

    // ──────────────────────────────────────────────────────────
    // 14) Final response
    // ──────────────────────────────────────────────────────────
    return new Response(JSON.stringify({
      status: "success",
      remainingGenerations: Math.max((profile.remaining_newsletter_generations ?? 1) - 1, 0),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Newsletter function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
