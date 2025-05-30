// =========================================================================================
//  manual-newsletter-generation.ts — ENHANCED PRODUCTION VERSION
//  (includes images, videos, rich layouts, author info, engagement metrics)
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
  // │ 5. Format tweets for OpenAI (ENHANCED)                                  │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  const tweetsForAI = formatTweetsForAI(apifyData);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 6. OpenAI – analysis JSON                                               │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("OpenAI analysis");
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) { console.error("Missing OPENAI_KEY"); return; }

  const analysisPrompt = buildAnalysisPrompt(selectedCount, tweetsForAI);
  const analysisJson = await chat(OPENAI_KEY, "gpt-4o", 0.7, 3000,
    "You are an expert content analyst specializing in social media content curation and newsletter creation. You excel at identifying visual content and creating engaging narratives.",
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
  const queryJson = await chat(OPENAI_KEY, "gpt-4o", 0.3, 800,
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
  const integrationJson = await chat(OPENAI_KEY, "gpt-4o", 0.3, 4000,
    "You integrate web-sourced information into existing analyses seamlessly while maintaining visual richness.",
    integrationPrompt
  );
  const integratedAnalysis = integrationJson.choices[0].message.content.trim();

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 8. OpenAI – RICH visual newsletter markdown                             │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Generating visual newsletter markdown");
  const newsletterPrompt = buildVisualNewsletterPrompt(integratedAnalysis, tweetsForAI);
  const markdownJson = await chat(OPENAI_KEY, "gpt-4o", 0.2, 6000,
    "You are a professional visual newsletter designer who creates stunning, magazine-quality newsletters with rich visual elements, images, and engaging layouts.",
    newsletterPrompt
  );
  let markdownNewsletter = markdownJson.choices[0].message.content.trim();
  markdownNewsletter = markdownNewsletter.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 9. UI/UX enhancement pass (markdown → enhanced markdown)                │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Enhancing UI/UX markdown");
  const enhancedPrompt = buildEnhancedPrompt(markdownNewsletter);
  const enhancedJson = await chat(OPENAI_KEY, "gpt-4o", 0.4, 6000,
    "You are a newsletter UI/UX specialist who creates visually stunning, modern newsletters with beautiful layouts, color schemes, and visual hierarchy.",
    enhancedPrompt
  );
  let enhancedMarkdown = enhancedJson.choices[0].message.content.trim();
  enhancedMarkdown = enhancedMarkdown.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 10. Markdown → RICH responsive HTML                                     │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Converting markdown → rich HTML");
  const emailHtml = markdownToRichHtml(enhancedMarkdown);

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
        subject: `Your Newsletter • ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
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
//  ENHANCED Helper: format tweets with ALL visual data
// ────────────────────────────────────────────────────────────────────────────────
function formatTweetsForAI(arr: any[]): string {
  let out = "";
  arr.forEach((t, i) => {
    const cleanText = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
    const date = new Date(t.createdAt).toISOString().split("T")[0];
    
    // Extract ALL media properly
    const media = t.extendedEntities?.media || [];
    const photos = media
      .filter((m: any) => m.type === "photo")
      .map((m: any) => m.media_url_https || m.media_url);
    
    const videos = media
      .filter((m: any) => m.type === "video" || m.type === "animated_gif")
      .map((m: any) => ({
        thumbnail: m.media_url_https || m.media_url,
        duration: m.video_info?.duration_millis || 0,
        aspectRatio: m.video_info?.aspect_ratio?.join(":") || "16:9"
      }));
    
    // Author info with avatar
    const authorName = t.author?.name || t.user?.name || "Unknown";
    const authorHandle = t.author?.username || t.user?.screen_name || "unknown";
    const authorAvatar = t.author?.profile_image_url || t.user?.profile_image_url_https || "";
    
    out += `Tweet ${i + 1}
Tweet ID: ${t.id}
Tweet URL: https://twitter.com/${authorHandle}/status/${t.id}
Author Name: ${authorName}
Author Handle: @${authorHandle}
Author Avatar: ${authorAvatar}
Author Verified: ${t.author?.verified || false}
Tweet Text: ${cleanText}
Engagement Score: ${(t.likeCount || 0) + (t.retweetCount || 0) * 2 + (t.replyCount || 0) * 3}
Likes: ${t.likeCount || 0}
Retweets: ${t.retweetCount || 0}
Replies: ${t.replyCount || 0}
Views: ${t.viewCount || 0}
Date: ${date}
Photos: ${photos.length > 0 ? photos.join(", ") : "None"}
Videos: ${videos.length > 0 ? JSON.stringify(videos) : "None"}
Quote Tweet: ${t.quotedStatus ? "Yes" : "No"}
Thread: ${t.in_reply_to_status_id ? "Part of thread" : "Standalone"}
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
//  ENHANCED Helper: build prompts with visual focus
// ────────────────────────────────────────────────────────────────────────────────
function buildAnalysisPrompt(count: number, tweets: string) {
  return `Analyze these ${count} bookmarked tweets to create a comprehensive, visually-rich newsletter analysis.

IMPORTANT: Pay special attention to:
1. Which tweets have images/videos (prioritize these for visual impact)
2. Engagement metrics (likes, retweets, views) to identify most popular content
3. Author information for credibility and visual attribution
4. Threads and conversations for deeper context

TWEETS:
${tweets}

Return a detailed JSON analysis with:
{
  "mainTopics": [
    {
      "title": "Topic title",
      "description": "Detailed description",
      "featuredTweetId": "ID of most engaging/visual tweet for this topic",
      "keyPoints": ["point1", "point2", "point3"],
      "relatedImages": ["image_url1", "image_url2"],
      "topAuthors": [{"name": "Author Name", "handle": "@handle", "avatar": "url"}]
    }
  ],
  "visualHighlights": [
    {
      "tweetId": "123",
      "imageUrl": "url",
      "caption": "Why this is significant",
      "engagement": 12500
    }
  ],
  "keyInsights": ["insight1", "insight2", "insight3"],
  "trendingThemes": ["theme1", "theme2"],
  "contentSummary": "Executive summary of all content",
  "recommendedSections": [
    {
      "title": "Section title",
      "content": "What to include",
      "suggestedVisuals": ["tweet_id1", "tweet_id2"]
    }
  ]
}`;
}

function buildQueryGenPrompt(analysis: string) {
  return `Select the 3 most significant topics from this analysis that would benefit from additional context. Create precise search queries optimized for current information.

Format as:
TOPIC 1: [Topic Name]
QUERY: [Specific search query]
ENRICHMENT GOAL: [What information to add]

TOPIC 2: [Topic Name]
QUERY: [Specific search query]
ENRICHMENT GOAL: [What information to add]

TOPIC 3: [Topic Name]
QUERY: [Specific search query]
ENRICHMENT GOAL: [What information to add]

ANALYSIS:
${analysis}`;
}

function buildIntegrationPrompt(analysis: string, enrichment: any[]) {
  return `Seamlessly integrate the web-sourced information into the existing analysis while maintaining focus on visual elements and engagement.

ORIGINAL ANALYSIS:
${analysis}

WEB ENRICHMENT:
${JSON.stringify(enrichment, null, 2)}

Return the fully integrated analysis maintaining the same JSON structure but with enriched content.`;
}

function buildVisualNewsletterPrompt(integrated: string, tweets: string) {
  return `Create a visually stunning, magazine-quality newsletter using the provided analysis and tweets.

CRITICAL REQUIREMENTS:
1. Include ALL images from tweets in appropriate sections
2. Create visual tweet cards showing author info and engagement
3. Use a modern, visually appealing layout with sections
4. Include emojis for visual appeal and better scanning
5. Feature high-engagement content prominently
6. Create visual hierarchy with varied section styles

NEWSLETTER STRUCTURE:

# 🌟 [Compelling Title Based on Main Theme]

> *[Date] • [Estimated read time] • Curated from [X] bookmarks*

---

## 📸 Today's Visual Highlight

[Feature the most engaging visual content - full width image with caption]
[Include author attribution and engagement metrics]

---

## 🔥 Main Story: [Primary Topic]

[Hero image if available]

[2-3 paragraph engaging introduction]

### 💡 Key Insights
[Visual callout boxes with key points]

### 📊 Notable Voices
[Tweet cards with author avatars, names, and key quotes]

### 🔗 Deep Dive
[Expanded analysis with supporting visuals]

---

## 🚀 Trending Topics

### 1. [Topic with icon]
[Brief description with supporting tweet/image]

### 2. [Topic with icon]
[Brief description with supporting tweet/image]

### 3. [Topic with icon]
[Brief description with supporting tweet/image]

---

## 💬 Community Pulse

[Grid layout of 3-4 high-engagement tweets with:
- Author avatar and name
- Tweet text
- Engagement metrics
- Any images]

---

## 📈 By The Numbers

[Visual statistics about the curated content:
- Total engagement
- Most liked tweet
- Most discussed topic
- Top contributors]

---

## 🎯 Quick Takes

[Bullet points of smaller interesting findings with mini images]

---

## 🔮 What's Next

[Forward-looking section based on trends identified]

---

*💌 Curated with AI assistance • Made possible by Chirpmetrics*

ANALYSIS:
${integrated}

ORIGINAL TWEETS:
${tweets}

Create the newsletter in clean, properly formatted Markdown with:
- Proper image syntax: ![alt text](url)
- Visual dividers between sections
- Consistent emoji usage
- Author attributions with @ handles
- Engagement metrics where relevant
- Mix of content types (quotes, images, analysis)`;
}

function buildEnhancedPrompt(rawMarkdown: string) {
  return `Transform this newsletter into a visually stunning, email-optimized version with enhanced UI/UX.

ENHANCEMENTS TO APPLY:

1. **Visual Headers**: Add gradient backgrounds or colored accents to section headers
2. **Image Styling**: Center images, add rounded corners, ensure proper sizing
3. **Tweet Cards**: Create visually distinct cards for tweet quotes with:
   - Author avatar (if URL provided)
   - Colored border or background
   - Engagement metrics in a visual way
4. **Callout Boxes**: Use colored backgrounds for important information
5. **Spacing**: Add proper vertical spacing between sections
6. **Color Scheme**: Use a cohesive color palette (blues, purples, greens)
7. **Typography**: Vary font sizes for hierarchy
8. **Mobile Optimization**: Ensure everything looks good on mobile

USE INLINE STYLES like:
- <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px;">
- <span style="color: #667eea; font-weight: bold;">
- <img style="max-width: 100%; border-radius: 12px; margin: 20px auto; display: block;">

CURRENT MARKDOWN:
${rawMarkdown}

Output the enhanced markdown with all visual improvements applied.`;
}

// ────────────────────────────────────────────────────────────────────────────────
//  ENHANCED Helper: markdown → RICH responsive HTML
// ────────────────────────────────────────────────────────────────────────────────
function markdownToRichHtml(md: string): string {
  const renderer = new marked.Renderer();
  
  // Enhanced image rendering with proper styling
  renderer.image = (href, title, alt) => `
    <div style="text-align: center; margin: 25px 0;">
      <img src="${href}" 
           alt="${alt}"
           title="${title || alt}"
           style="max-width: 100%; width: auto; max-height: 400px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      ${title ? `<p style="margin-top: 10px; font-size: 14px; color: #666; font-style: italic;">${title}</p>` : ''}
    </div>`;
  
  // Enhanced heading rendering
  renderer.heading = (text, level) => {
    const sizes = ['32px', '28px', '24px', '20px', '18px', '16px'];
    const colors = ['#1a1a1a', '#2d3748', '#4a5568', '#718096', '#a0aec0', '#cbd5e0'];
    return `<h${level} style="
      font-size: ${sizes[level - 1]}; 
      color: ${colors[level - 1]}; 
      margin: ${level === 1 ? '30px' : '20px'} 0 15px 0;
      font-weight: ${level <= 2 ? '800' : '600'};
      line-height: 1.3;
      ${level === 1 ? 'text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;' : ''}
    ">${text}</h${level}>`;
  };
  
  // Enhanced blockquote rendering
  renderer.blockquote = (quote) => `
    <blockquote style="
      margin: 20px 0;
      padding: 20px;
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      border-left: 4px solid #667eea;
      border-radius: 8px;
      font-style: italic;
      color: #2d3748;
    ">${quote}</blockquote>`;
  
  // Enhanced list rendering
  renderer.list = (body, ordered) => {
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag} style="
      margin: 15px 0;
      padding-left: 25px;
      line-height: 1.8;
      color: #4a5568;
    ">${body}</${tag}>`;
  };
  
  // Enhanced paragraph rendering
  renderer.paragraph = (text) => {
    // Check if it's a centered text (starts with > *)
    if (text.includes('style=')) {
      return `<p>${text}</p>`;
    }
    return `<p style="margin: 15px 0; line-height: 1.7; color: #2d3748; font-size: 16px;">${text}</p>`;
  };
  
  // Enhanced horizontal rule
  renderer.hr = () => `
    <hr style="
      margin: 30px 0;
      border: none;
      height: 2px;
      background: linear-gradient(to right, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent);
    ">`;
  
  const html = marked(md, { renderer });
  
  // Wrap in beautiful email template
  return juice(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Newsletter</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 100%; background-color: #f7fafc; padding: 20px 10px;">
        <!-- Header -->
        <div style="max-width: 650px; margin: 0 auto 20px; text-align: center;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px;">YOUR CURATED</h1>
            <h1 style="color: white; margin: 5px 0 0 0; font-size: 36px; font-weight: 800;">NEWSLETTER</h1>
          </div>
        </div>
        
        <!-- Main Content Container -->
        <div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden;">
          <div style="padding: 40px 30px;">
            ${html}
          </div>
          
          <!-- Footer -->
          <div style="background: #f7fafc; padding: 30px; text-align: center; border-top: 2px solid #e2e8f0;">
            <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px;">
              Curated with ❤️ by Chirpmetrics
            </p>
            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
              Transform your Twitter bookmarks into beautiful newsletters
            </p>
            <div style="margin-top: 20px;">
              <a href="https://chirpmetrics.com" style="color: #667eea; text-decoration: none; font-weight: 600; font-size: 14px;">
                Create Your Own Newsletter →
              </a>
            </div>
          </div>
        </div>
        
        <!-- Email Footer -->
        <div style="max-width: 650px; margin: 20px auto 0; text-align: center;">
          <p style="color: #a0aec0; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Chirpmetrics. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `);
}
