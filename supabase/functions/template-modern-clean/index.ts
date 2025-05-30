// =========================================================================================
//  premium-newsletter-generation.ts — HIGH-QUALITY VISUAL + TEXT DENSE VERSION
//  (sophisticated design, strategic visuals, information density, premium presentation)
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
  // │ 5. Format tweets for OpenAI (ENHANCED WITH VISUAL DATA)                 │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  const tweetsForAI = formatTweetsForPremiumAnalysis(apifyData);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 6. OpenAI – comprehensive analysis with visual strategy                 │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("OpenAI comprehensive analysis");
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) { console.error("Missing OPENAI_KEY"); return; }

  const analysisPrompt = buildPremiumAnalysisPrompt(selectedCount, tweetsForAI);
  const analysisJson = await chat(OPENAI_KEY, "gpt-4o", 0.2, 4000,
    "You are a senior editorial strategist for premium business publications who excels at creating information-dense content with sophisticated visual presentation.",
    analysisPrompt
  );
  let analysisContent = analysisJson.choices[0].message.content.trim();
  
  // Strip markdown code blocks if present
  analysisContent = analysisContent.replace(/^```json\n?/gm, "").replace(/\n?```$/gm, "");

  let analysisParsed: any;
  try { 
    analysisParsed = JSON.parse(analysisContent); 
  } catch (parseErr) {
    console.warn("Failed to parse analysis JSON – using fallback skeleton", parseErr);
    analysisParsed = {
      executiveSummary: "Summary...",
      keyThemes: [],
      visualStrategy: { heroImage: null, supportingVisuals: [] }
    };
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 7. Strategic query generation → Perplexity enrichment                   │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Generating strategic research queries");
  const queryGenPrompt = buildStrategicQueryPrompt(analysisContent);
  const queryJson = await chat(OPENAI_KEY, "gpt-4o", 0.2, 1000,
    "You are a research strategist who identifies the most critical information gaps for business decision-making.",
    queryGenPrompt
  );
  const queryText = queryJson.choices[0].message.content.trim();

  const parsedQueries: { topic: string; query: string; goal: string }[] = [];
  const re = /RESEARCH \d+:\s*(.+?)\s*QUERY:\s*(.+?)\s*OBJECTIVE:\s*(.+?)(?=\n\s*RESEARCH \d+:|$)/gis;
  let m; while ((m = re.exec(queryText)) !== null) {
    parsedQueries.push({ topic: m[1].trim(), query: m[2].trim(), goal: m[3].trim() });
  }

  const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  const enrichmentResults: any[] = [];
  if (PERPLEXITY_KEY) {
    logStep("Strategic research enrichment", { count: parsedQueries.length });
    for (const research of parsedQueries) {
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
              max_tokens: 500,
              search_recency_filter: "week"
            })
          }
        );
        if (pRes.ok) {
          const pJson = await pRes.json();
          enrichmentResults.push({
            topic: research.topic,
            query: research.query,
            goal:  research.goal,
            analysis: pJson.choices[0].message.content,
            sources: pJson.citations ?? []
          });
        } else {
          enrichmentResults.push({ ...research, analysis: `[Research unavailable - ${pRes.status}]`, sources: [] });
        }
      } catch (err) {
        enrichmentResults.push({ ...research, analysis: "[Research failed]", sources: [] });
      }
    }
  } else {
    logStep("No PERPLEXITY_API_KEY – skipping strategic research");
  }

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 8. Integration and synthesis                                             │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Synthesizing comprehensive analysis");
  const synthesisPrompt = buildSynthesisPrompt(analysisContent, enrichmentResults);
  const synthesisJson = await chat(OPENAI_KEY, "gpt-4o", 0.2, 4000,
    "You are a senior strategic analyst who synthesizes complex information into actionable business intelligence with visual presentation strategy.",
    synthesisPrompt
  );
  const synthesizedAnalysis = synthesisJson.choices[0].message.content.trim();

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 9. Premium newsletter generation                                        │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Generating premium newsletter");
  const newsletterPrompt = buildPremiumNewsletterPrompt(synthesizedAnalysis, tweetsForAI);
  const markdownJson = await chat(OPENAI_KEY, "gpt-4o", 0.1, 6000,
    "You are the editorial director of a premium business publication known for sophisticated design, information density, and strategic use of visuals. Think Financial Times meets The Economist.",
    newsletterPrompt
  );
  let markdownNewsletter = markdownJson.choices[0].message.content.trim();
  markdownNewsletter = markdownNewsletter.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 10. Premium design enhancement                                          │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Applying premium design enhancement");
  const designPrompt = buildDesignEnhancementPrompt(markdownNewsletter);
  const designJson = await chat(OPENAI_KEY, "gpt-4o", 0.1, 6000,
    "You are a premium newsletter design specialist who creates sophisticated, visually appealing layouts that enhance readability while maintaining information density.",
    designPrompt
  );
  let enhancedMarkdown = designJson.choices[0].message.content.trim();
  enhancedMarkdown = enhancedMarkdown.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 11. Markdown → Premium responsive HTML                                  │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Converting to premium HTML");
  const emailHtml = markdownToPremiumHtml(enhancedMarkdown);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 12. Store in newsletter_storage                                         │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Storing newsletter");
  const { data: stored, error: storeErr } = await supabase
    .from("newsletter_storage")
    .insert({
      user_id:      userId,
      markdown_text: enhancedMarkdown
    })
    .select()
    .single();
  if (storeErr) console.error("Storage error", storeErr);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 13. Decrement remaining generations                                     │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  await supabase
    .from("profiles")
    .update({ remaining_newsletter_generations: profile.remaining_newsletter_generations - 1 })
    .eq("id", userId);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 14. Send email via Resend                                               │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  if (profile.sending_email) {
    try {
      logStep("Sending email");
      await resend.emails.send({
        from:    Deno.env.get("FROM_EMAIL") || "Chirpmetrics <newsletters@chirpmetrics.com>",
        to:      [profile.sending_email],
        subject: `Intelligence Brief • ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
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
//  PREMIUM Helper: format tweets with strategic visual assessment
// ────────────────────────────────────────────────────────────────────────────────
function formatTweetsForPremiumAnalysis(arr: any[]): string {
  let out = "";
  arr.forEach((t, i) => {
    const cleanText = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
    const date = new Date(t.createdAt).toISOString().split("T")[0];
    
    // Enhanced visual content analysis
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
    
    // Author credibility metrics
    const authorName = t.author?.name || t.user?.name || "Unknown";
    const authorHandle = t.author?.username || t.user?.screen_name || "unknown";
    const authorAvatar = t.author?.profile_image_url || t.user?.profile_image_url_https || "";
    const verified = t.author?.verified || false;
    const followerCount = t.author?.public_metrics?.followers_count || 0;
    
    // Engagement analysis
    const totalEngagement = (t.likeCount || 0) + (t.retweetCount || 0) + (t.replyCount || 0);
    const engagementRate = followerCount > 0 ? (totalEngagement / followerCount * 100).toFixed(2) : "0";
    
    // Visual impact score (for design decisions)
    const visualImpactScore = photos.length * 3 + videos.length * 5 + (totalEngagement > 1000 ? 2 : 0);
    
    out += `TWEET ${i + 1} | Visual Impact Score: ${visualImpactScore}
Content: ${cleanText}
Author: ${authorName} (@${authorHandle})
Author Avatar: ${authorAvatar}
Verification: ${verified ? "Verified" : "Unverified"}
Audience Reach: ${followerCount.toLocaleString()} followers
Engagement: ${t.likeCount || 0} likes, ${t.retweetCount || 0} shares, ${t.replyCount || 0} replies
Engagement Rate: ${engagementRate}%
Publication Date: ${date}
Visual Content: ${photos.length} photos, ${videos.length} videos
Photo URLs: ${photos.length > 0 ? photos.join(" | ") : "None"}
Video Data: ${videos.length > 0 ? JSON.stringify(videos) : "None"}
Content Type: ${t.quotedStatus ? "Quote tweet with analysis" : "Original content"}
Thread Context: ${t.in_reply_to_status_id ? "Part of conversation" : "Standalone"}
Strategic Value: ${totalEngagement > 500 ? "High engagement" : totalEngagement > 100 ? "Medium engagement" : "Standard"}
`;
    if (i < arr.length - 1) out += "\n═══════════════════════════════════════════════════════════════════════════\n\n";
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
//  PREMIUM PROMPT BUILDERS
// ────────────────────────────────────────────────────────────────────────────────
function buildPremiumAnalysisPrompt(count: number, tweets: string) {
  return `Analyze these ${count} curated tweets to create premium newsletter content with strategic visual presentation.

ANALYSIS OBJECTIVES:
1. Extract high-value business intelligence and strategic insights
2. Identify content suitable for visual enhancement (charts, images, infographics)
3. Plan sophisticated visual hierarchy for maximum reader engagement
4. Assess source credibility and strategic value
5. Develop narrative flow with visual anchoring points

VISUAL STRATEGY CONSIDERATIONS:
- Which tweets have high-quality images suitable for hero/feature placement
- What data points could be visualized as charts or infographics
- How to use visuals to break up dense text while maintaining professionalism
- Strategic placement of author avatars and social proof elements

TWEETS TO ANALYZE:
${tweets}

Return comprehensive JSON analysis:
{
  "executiveSummary": "2-3 sentences of highest-value insights for busy executives",
  "visualStrategy": {
    "heroImage": {
      "tweetId": "best visual content for main feature",
      "imageUrl": "URL if available",
      "rationale": "why this image leads the story"
    },
    "supportingVisuals": [
      {
        "tweetId": "tweet with valuable visual",
        "imageUrl": "URL",
        "placement": "where in newsletter this should appear",
        "context": "how this visual supports the narrative"
      }
    ],
    "dataVisualizationOpportunities": [
      "metrics or trends that could become charts/infographics"
    ]
  },
  "keyThemes": [
    {
      "theme": "Primary business theme",
      "description": "Detailed explanation with market context",
      "businessImplications": "Strategic implications for organizations",
      "supportingEvidence": ["key quotes and data points"],
      "confidenceLevel": "high/medium/low",
      "relatedVisuals": ["tweetIds with supporting imagery"]
    }
  ],
  "marketSignals": [
    {
      "signal": "Emerging trend or market shift",
      "evidence": "Supporting data and expert opinions",
      "timeframe": "When this might impact business",
      "affectedSectors": ["relevant industries"],
      "confidenceLevel": "high/medium/low"
    }
  ],
  "thoughtLeaders": [
    {
      "author": "Name and credentials",
      "handle": "@username",
      "avatarUrl": "profile image URL",
      "keyInsight": "Most valuable contribution",
      "credibilityFactors": "verification, followers, expertise",
      "quotability": "how suitable for prominent quotes"
    }
  ],
  "actionableIntelligence": [
    {
      "insight": "Specific strategic recommendation",
      "rationale": "Supporting analysis",
      "urgency": "immediate/short-term/strategic",
      "implementation": "concrete next steps"
    }
  ],
  "narrativeFlow": {
    "openingHook": "compelling way to start the newsletter",
    "keyTransitions": "how to connect main themes",
    "closingMessage": "strategic takeaway for readers"
  }
}`;
}

function buildStrategicQueryPrompt(analysis: string) {
  return `Based on this analysis, identify 3 critical knowledge gaps requiring current market intelligence for strategic decision-making.

Focus on:
1. Market developments that could impact the identified themes
2. Competitive landscape changes
3. Regulatory or policy developments affecting business strategy

Format:
RESEARCH 1: [Strategic Focus Area]
QUERY: [Specific market intelligence query]
OBJECTIVE: [Strategic decision this supports]

RESEARCH 2: [Strategic Focus Area]
QUERY: [Specific market intelligence query]
OBJECTIVE: [Strategic decision this supports]

RESEARCH 3: [Strategic Focus Area]
QUERY: [Specific market intelligence query]
OBJECTIVE: [Strategic decision this supports]

ANALYSIS:
${analysis}`;
}

function buildSynthesisPrompt(analysis: string, enrichment: any[]) {
  return `Integrate the social intelligence with current market research to create a comprehensive strategic brief with visual presentation strategy.

ORIGINAL ANALYSIS:
${analysis}

MARKET RESEARCH:
${JSON.stringify(enrichment, null, 2)}

Synthesize to create:
1. Validated insights with current market context
2. Enhanced visual strategy based on available content
3. Strengthened business case with current data
4. Refined narrative flow incorporating new intelligence
5. Strategic recommendations supported by multiple sources

Return enhanced analysis maintaining the original JSON structure but with enriched, validated content and refined visual strategy.`;
}

function buildPremiumNewsletterPrompt(analysis: string, tweets: string) {
  return `Create a premium newsletter that balances sophisticated visual design with information density. Think Financial Times quality with The Economist's analytical depth.

DESIGN PRINCIPLES:
- Information-dense but visually appealing and easy to scan
- Strategic use of visuals to enhance (not distract from) content
- Professional color palette with strategic accent colors
- Excellent typography hierarchy for quick scanning
- Thoughtful spacing and visual breaks
- High-quality imagery placement where it adds value

CONTENT REQUIREMENTS:
- Every paragraph should deliver business value
- Use specific data points and concrete examples
- Include strategic insights and actionable intelligence
- Maintain sophisticated, professional tone
- Structure for busy executives who scan first, read second

NEWSLETTER STRUCTURE:

# Intelligence Brief
*[Date] • Strategic Analysis • [Reading Time]*

## Executive Summary
[2-3 sentences capturing critical insights with immediate business relevance]

---

## Featured Analysis: [Primary Theme]
![Hero Image Description](image-url-if-available)
*Caption explaining relevance*

[Opening paragraph setting context and importance]

### Key Developments
[Dense paragraph with specific developments, supported by data]

### Market Implications
[Strategic analysis of business impact with supporting evidence]

### Expert Perspectives
> "[Compelling quote from credible source]"  
> — [Author Name], [Credentials] | [Engagement metrics as social proof]

[Additional analysis connecting the quote to broader implications]

---

## Strategic Intelligence

### [Secondary Theme - 2-3 words]
[Two dense paragraphs covering this theme with specific business intelligence]

![Supporting Visual](image-url)
*Strategic context for this visual*

[Analysis continuing from the visual]

### [Tertiary Theme - 2-3 words]  
[Focused analysis of emerging trends with concrete examples]

---

## Market Signals

**Immediate Indicators**
[Bulleted insights for quick scanning - each bullet 1-2 lines]

**Medium-term Trends**  
[Pattern analysis with specific timeframes and business impact]

**Strategic Positioning**
[How organizations should respond to identified signals]

---

## Notable Voices

[Grid of 2-3 expert perspectives with avatars and credentials]

**[Expert Name]** | [Handle] | [Follower count]  
"[Key insight quote]"  
*Analysis: [Why this perspective matters strategically]*

---

## Action Intelligence

### Next 30 Days
[Specific actions organizations should consider]

### Strategic Planning
[Longer-term considerations for business strategy]

### Monitoring Points
[Key indicators to track for future developments]

---

## Research Methodology
*This analysis synthesizes [X] curated sources, current market intelligence, and strategic assessment. Visual content selected for analytical relevance and source credibility.*

---

ANALYSIS TO SYNTHESIZE:
${analysis}

TWEET SOURCES:
${tweets}

Create sophisticated, visually-enhanced content that delivers maximum strategic value while maintaining professional presentation standards. Use strategic visual elements to guide attention and enhance comprehension.`;
}

function buildDesignEnhancementPrompt(newsletter: string) {
  return `Enhance this newsletter with sophisticated visual design elements while preserving information density and professional tone.

ENHANCEMENT OBJECTIVES:
1. Add strategic color accents (professional blue/grey palette)
2. Improve spacing and visual hierarchy
3. Add subtle visual elements that guide reading flow
4. Enhance typography without overwhelming content
5. Create scannable sections with visual anchors
6. Maintain business publication standards (Financial Times/Economist quality)

SPECIFIC IMPROVEMENTS:
- Section headers with subtle background colors or accent lines
- Callout boxes for key insights (minimal, elegant styling)
- Strategic use of spacing to create visual breathing room
- Enhanced quote formatting with professional styling
- Author attribution with visual hierarchy
- Data points highlighted for quick reference
- Professional dividers between sections

CURRENT NEWSLETTER:
${newsletter}

Apply sophisticated design enhancements using inline HTML/CSS styling that creates a premium reading experience while maintaining content focus. Use a professional color palette (navy blues, subtle greys, strategic accent colors).`;
}

// ────────────────────────────────────────────────────────────────────────────────
//  PREMIUM Helper: markdown → sophisticated responsive HTML
// ────────────────────────────────────────────────────────────────────────────────
function markdownToPremiumHtml(md: string): string {
  const renderer = new marked.Renderer();
  
  // Premium heading styling with sophisticated hierarchy
  renderer.heading = (text, level) => {
    const styles = {
      1: 'font-size: 32px; color: #1a365d; margin: 40px 0 25px 0; font-weight: 700; line-height: 1.2; border-bottom: 3px solid #2d5aa0; padding-bottom: 15px;',
      2: 'font-size: 24px; color: #2d3748; margin: 35px 0 20px 0; font-weight: 600; line-height: 1.3; border-left: 4px solid #4299e1; padding-left: 20px; background: linear-gradient(90deg, #f7fafc 0%, transparent 100%); padding: 15px 0 15px 20px;',
      3: 'font-size: 20px; color: #2d3748; margin: 25px 0 15px 0; font-weight: 600; line-height: 1.4;',
      4: 'font-size: 18px; color: #4a5568; margin: 20px 0 12px 0; font-weight: 500; line-height: 1.4;',
      5: 'font-size: 16px; color: #718096; margin: 15px 0 10px 0; font-weight: 500;',
      6: 'font-size: 14px; color: #a0aec0; margin: 12px 0 8px 0; font-weight: 500;'
    };
    
    return `<h${level} style="${styles[level as keyof typeof styles]}">${text}</h${level}>`;
  };
  
  // Enhanced image rendering with sophisticated presentation
  renderer.image = (href, title, alt) => `
    <div style="margin: 30px 0; text-align: center;">
      <div style="display: inline-block; max-width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border-radius: 8px; overflow: hidden;">
        <img src="${href}" 
             alt="${alt}"
             title="${title || alt}"
             style="width: 100%; height: auto; display: block; max-width: 600px;">
      </div>
      ${title ? `<p style="margin: 15px 0 0 0; font-size: 14px; color: #718096; font-style: italic; max-width: 600px; margin-left: auto; margin-right: auto;">${title}</p>` : ''}
    </div>`;
  
  // Premium paragraph styling with optimal readability
  renderer.paragraph = (text) => {
    // Handle special formatting
    if (text.includes('style=') || text.includes('<div')) {
      return text;
    }
    
    // Check for metadata line (dates, reading time, etc.)
    if (text.includes('•') && text.length < 100) {
      return `<p style="
        margin: 0 0 25px 0; 
        text-align: center; 
        color: #718096; 
        font-size: 14px; 
        font-weight: 400;
        letter-spacing: 0.5px;
      ">${text}</p>`;
    }
    
    return `<p style="
      margin: 0 0 18px 0; 
      line-height: 1.7; 
      color: #2d3748; 
      font-size: 16px;
      font-weight: 400;
    ">${text}</p>`;
  };
  
  // Sophisticated blockquote styling
  renderer.blockquote = (quote) => `
    <div style="
      margin: 25px 0;
      padding: 25px 30px;
      background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%);
      border-left: 4px solid #4299e1;
      border-radius: 0 8px 8px 0;
      position: relative;
    ">
      <div style="
        font-size: 18px;
        line-height: 1.6;
        color: #2d3748;
        font-style: italic;
        margin-bottom: 10px;
      ">${quote}</div>
    </div>`;
  
  // Enhanced list styling
  renderer.list = (body, ordered) => {
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag} style="
      margin: 20px 0;
      padding-left: 25px;
      line-height: 1.8;
      color: #2d3748;
    ">${body}</${tag}>`;
  };
  
  renderer.listitem = (text) => `
    <li style="margin-bottom: 8px; font-size: 16px;">${text}</li>`;
  
  // Premium horizontal rule
  renderer.hr = () => `
    <div style="margin: 40px 0; text-align: center;">
      <div style="
        width: 60px;
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, #4299e1 50%, transparent 100%);
        margin: 0 auto;
      "></div>
    </div>`;
  
  const html = marked(md, { renderer });
  
  // Wrap in premium email template
  return juice(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Intelligence Brief</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
      <!-- Email Container -->
      <div style="max-width: 100%; background-color: #f8fafc; padding: 20px 15px;">
        
        <!-- Header -->
        <div style="max-width: 700px; margin: 0 auto 30px; text-align: center;">
          <div style="
            background: linear-gradient(135deg, #1a365d 0%, #2d5aa0 50%, #4299e1 100%);
            padding: 40px 30px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(26, 54, 93, 0.2);
          ">
            <h1 style="
              color: white; 
              margin: 0 0 8px 0; 
              font-size: 28px; 
              font-weight: 300; 
              letter-spacing: 3px;
            ">INTELLIGENCE</h1>
            <h1 style="
              color: #bee3f8; 
              margin: 0; 
              font-size: 42px; 
              font-weight: 700;
              letter-spacing: 1px;
            ">BRIEF</h1>
          </div>
        </div>
        
        <!-- Main Content -->
        <div style="max-width: 700px; margin: 0 auto;">
          <div style="
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          ">
            <div style="padding: 50px 40px;">
              ${html}
            </div>
            
            <!-- Newsletter Footer -->
            <div style="
              background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%);
              padding: 35px 40px;
              border-top: 1px solid #e2e8f0;
            ">
              <div style="text-align: center;">
                <h3 style="
                  margin: 0 0 15px 0;
                  color: #2d3748;
                  font-size: 18px;
                  font-weight: 600;
                ">Powered by Chirpmetrics</h3>
                <p style="
                  margin: 0 0 20px 0;
                  color: #718096;
                  font-size: 14px;
                  line-height: 1.6;
                ">Transform your social intelligence into strategic advantage.<br>
                Professional newsletter generation from curated content.</p>
                <div style="margin-top: 25px;">
                  <a href="https://chirpmetrics.com" style="
                    display: inline-block;
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #4299e1 0%, #2d5aa0 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 14px;
                    letter-spacing: 0.5px;
                  ">Create Your Newsletter →</a>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Email Footer -->
        <div style="max-width: 700px; margin: 25px auto 0; text-align: center;">
          <p style="
            color: #a0aec0;
            font-size: 12px;
            margin: 0;
            line-height: 1.5;
          ">© ${new Date().getFullYear()} Chirpmetrics. Premium business intelligence.<br>
          This analysis is generated from curated social media content and market research.</p>
        </div>
      </div>
    </body>
    </html>
  `);
}
