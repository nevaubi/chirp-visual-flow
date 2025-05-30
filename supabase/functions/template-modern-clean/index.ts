// =========================================================================================
//  professional-newsletter-generation.ts — ENHANCED PROFESSIONAL VERSION
//  (focuses on text density, professional layout, minimal colors, business-like presentation)
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
  // │ 5. Format tweets for OpenAI (CONTENT-FOCUSED)                           │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  const tweetsForAI = formatTweetsForAnalysis(apifyData);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 6. OpenAI – deep content analysis                                       │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("OpenAI analysis");
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_KEY) { console.error("Missing OPENAI_KEY"); return; }

  const analysisPrompt = buildContentAnalysisPrompt(selectedCount, tweetsForAI);
  const analysisJson = await chat(OPENAI_KEY, "gpt-4o", 0.3, 4000,
    "You are a senior business analyst and content strategist specializing in extracting actionable insights from social media discourse for professional audiences.",
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
      marketImplications: [],
      actionableInsights: []
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
    "You are a senior strategic analyst who synthesizes complex information into actionable business intelligence.",
    synthesisPrompt
  );
  const synthesizedAnalysis = synthesisJson.choices[0].message.content.trim();

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 9. Professional newsletter generation                                   │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Generating professional newsletter");
  const newsletterPrompt = buildProfessionalNewsletterPrompt(synthesizedAnalysis, tweetsForAI);
  const markdownJson = await chat(OPENAI_KEY, "gpt-4o", 0.1, 6000,
    "You are a professional newsletter editor for a premium business publication, specializing in dense, informative content that delivers maximum value to busy executives and decision-makers.",
    newsletterPrompt
  );
  let markdownNewsletter = markdownJson.choices[0].message.content.trim();
  markdownNewsletter = markdownNewsletter.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 10. Professional formatting pass                                        │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Applying professional formatting");
  const formattedPrompt = buildFormattingPrompt(markdownNewsletter);
  const formattedJson = await chat(OPENAI_KEY, "gpt-4o", 0.1, 6000,
    "You are a professional newsletter formatter who creates clean, scannable, business-appropriate layouts that prioritize readability and information density.",
    formattedPrompt
  );
  let formattedMarkdown = formattedJson.choices[0].message.content.trim();
  formattedMarkdown = formattedMarkdown.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 11. Markdown → Professional HTML                                        │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Converting to professional HTML");
  const emailHtml = markdownToProfessionalHtml(formattedMarkdown);

  // ╭──────────────────────────────────────────────────────────────────────────╮
  // │ 12. Store in newsletter_storage                                         │
  // ╰──────────────────────────────────────────────────────────────────────────╯
  logStep("Storing newsletter");
  const { data: stored, error: storeErr } = await supabase
    .from("newsletter_storage")
    .insert({
      user_id:      userId,
      markdown_text: formattedMarkdown
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
        subject: `Strategic Brief • ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
        html:    emailHtml,
        text:    formattedMarkdown
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
//  PROFESSIONAL Helper: format tweets for business analysis
// ────────────────────────────────────────────────────────────────────────────────
function formatTweetsForAnalysis(arr: any[]): string {
  let out = "";
  arr.forEach((t, i) => {
    const cleanText = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
    const date = new Date(t.createdAt).toISOString().split("T")[0];
    
    // Focus on author credibility and content substance
    const authorName = t.author?.name || t.user?.name || "Unknown";
    const authorHandle = t.author?.username || t.user?.screen_name || "unknown";
    const verified = t.author?.verified || false;
    const followerCount = t.author?.public_metrics?.followers_count || 0;
    
    // Calculate engagement rate for credibility assessment
    const totalEngagement = (t.likeCount || 0) + (t.retweetCount || 0) + (t.replyCount || 0);
    const engagementRate = followerCount > 0 ? (totalEngagement / followerCount * 100).toFixed(2) : "0";
    
    out += `TWEET ${i + 1}
Content: ${cleanText}
Author: ${authorName} (@${authorHandle})
Verification Status: ${verified ? "Verified" : "Unverified"}
Follower Count: ${followerCount.toLocaleString()}
Engagement Metrics: ${t.likeCount || 0} likes, ${t.retweetCount || 0} retweets, ${t.replyCount || 0} replies
Engagement Rate: ${engagementRate}%
Publication Date: ${date}
Thread Context: ${t.in_reply_to_status_id ? "Part of conversation thread" : "Standalone tweet"}
Content Type: ${t.quotedStatus ? "Quote tweet with commentary" : "Original content"}
`;
    if (i < arr.length - 1) out += "\n────────────────────────────────────────\n\n";
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
//  PROFESSIONAL PROMPT BUILDERS
// ────────────────────────────────────────────────────────────────────────────────
function buildContentAnalysisPrompt(count: number, tweets: string) {
  return `Analyze these ${count} curated tweets to extract strategic business intelligence and actionable insights.

ANALYSIS FRAMEWORK:
1. Identify recurring themes with business implications
2. Assess source credibility and reach
3. Extract actionable intelligence for decision-makers
4. Identify emerging trends and market signals
5. Synthesize key takeaways for strategic planning

TWEETS TO ANALYZE:
${tweets}

Provide comprehensive JSON analysis:
{
  "executiveSummary": "2-3 sentence high-level overview of the most critical findings",
  "keyThemes": [
    {
      "theme": "Theme name",
      "description": "Detailed explanation",
      "businessImplications": "What this means for organizations",
      "supportingEvidence": ["key tweet excerpts"],
      "confidence": "high/medium/low based on source quality and consensus"
    }
  ],
  "marketSignals": [
    {
      "signal": "Emerging trend or shift",
      "evidence": "Supporting data points",
      "timeframe": "When this might impact markets",
      "sectors": ["affected industries"]
    }
  ],
  "thoughtLeaders": [
    {
      "author": "Name and credentials",
      "keyInsight": "Most important point they made",
      "credibility": "follower count and verification status"
    }
  ],
  "actionableInsights": [
    {
      "insight": "Specific recommendation",
      "rationale": "Why this matters",
      "urgency": "immediate/short-term/long-term"
    }
  ],
  "informationGaps": [
    "Areas requiring additional research for complete understanding"
  ]
}`;
}

function buildStrategicQueryPrompt(analysis: string) {
  return `Based on this analysis, identify the 3 most critical information gaps that require current market data to make informed strategic decisions.

Create research queries focused on:
1. Market implications and business impact
2. Latest developments in identified trends
3. Competitive landscape changes

Format as:
RESEARCH 1: [Strategic Topic]
QUERY: [Specific business-focused search query]
OBJECTIVE: [What strategic decision this informs]

RESEARCH 2: [Strategic Topic]
QUERY: [Specific business-focused search query]
OBJECTIVE: [What strategic decision this informs]

RESEARCH 3: [Strategic Topic]
QUERY: [Specific business-focused search query]
OBJECTIVE: [What strategic decision this informs]

ANALYSIS:
${analysis}`;
}

function buildSynthesisPrompt(analysis: string, enrichment: any[]) {
  return `Synthesize the social media analysis with current market research to create a comprehensive strategic brief.

ORIGINAL ANALYSIS:
${analysis}

CURRENT MARKET RESEARCH:
${JSON.stringify(enrichment, null, 2)}

Integrate findings to create enhanced analysis that:
1. Validates or challenges initial insights with current data
2. Provides broader market context
3. Identifies concrete business opportunities and risks
4. Delivers actionable strategic recommendations

Return the enhanced analysis in the same JSON structure but with enriched, validated content.`;
}

function buildProfessionalNewsletterPrompt(analysis: string, tweets: string) {
  return `Create a professional, text-dense strategic brief in the style of premium business publications (Bloomberg Intelligence, McKinsey Insights, or Harvard Business Review).

REQUIREMENTS:
- Maximum information density - every sentence should deliver value
- Professional tone suitable for C-suite executives
- NO images, emojis, or visual elements 
- Focus on strategic implications and actionable insights
- Use data and specific examples to support points
- Include direct quotes only when they add substantial analytical value
- Structure for rapid scanning while maintaining depth

NEWSLETTER STRUCTURE:

# Strategic Brief • [Date]

## Executive Summary
[2-3 sentences capturing the most critical insights and their business implications]

## Key Developments

### [Primary Theme/Trend Name]
[3-4 paragraphs of dense analysis including:
- What's happening and why it matters
- Supporting evidence and data points
- Business implications
- Strategic considerations for organizations]

### [Secondary Theme/Trend Name]
[Similar structure - substantive analysis with concrete details]

### [Tertiary Theme/Trend Name]
[Focused analysis of emerging trends or signals]

## Market Intelligence

### Industry Dynamics
[Analysis of sector-specific implications]

### Competitive Landscape
[Shifts in competitive positioning or new entrants]

### Regulatory Environment
[Policy changes or regulatory trends affecting business]

## Strategic Implications

### Immediate Actions
[What organizations should do in the next 30-90 days]

### Medium-term Planning
[Strategic considerations for 6-12 month horizon]

### Long-term Positioning
[Implications for 2-3 year strategic planning]

## Notable Perspectives
[Selected insights from credible sources with analysis of their significance]

## Research Methodology
[Brief note on data sources and analysis framework]

---

*This brief synthesizes insights from [X] curated sources and current market analysis. Strategic recommendations based on observed trends and verified market intelligence.*

ANALYSIS TO SYNTHESIZE:
${analysis}

ORIGINAL SOURCES:
${tweets}

Create substantive, information-dense content that delivers maximum strategic value per word. Avoid fluff, maintain professional tone, and focus on actionable intelligence.`;
}

function buildFormattingPrompt(newsletter: string) {
  return `Polish this newsletter for professional presentation while maintaining information density.

FORMATTING REQUIREMENTS:
- Clean, scannable structure with consistent hierarchy
- Professional section headers without decorative elements
- Proper paragraph breaks for readability
- Bulleted lists only for specific action items
- No visual elements, colors, or emojis
- Business-appropriate language throughout
- Ensure smooth transitions between sections

CURRENT NEWSLETTER:
${newsletter}

Return the polished version with improved formatting and flow while preserving all analytical content.`;
}

// ────────────────────────────────────────────────────────────────────────────────
//  PROFESSIONAL Helper: markdown → clean business HTML
// ────────────────────────────────────────────────────────────────────────────────
function markdownToProfessionalHtml(md: string): string {
  const renderer = new marked.Renderer();
  
  // Clean, professional heading styling
  renderer.heading = (text, level) => {
    const sizes = ['28px', '22px', '18px', '16px', '14px', '13px'];
    const margins = ['35px 0 20px 0', '25px 0 15px 0', '20px 0 12px 0', '15px 0 10px 0', '12px 0 8px 0', '10px 0 6px 0'];
    const weights = ['700', '600', '600', '500', '500', '400'];
    
    return `<h${level} style="
      font-size: ${sizes[level - 1]}; 
      color: #1a202c; 
      margin: ${margins[level - 1]};
      font-weight: ${weights[level - 1]};
      line-height: 1.3;
      border-bottom: ${level <= 2 ? '1px solid #e2e8f0;' : 'none'}
      padding-bottom: ${level <= 2 ? '8px;' : '0;'}
    ">${text}</h${level}>`;
  };
  
  // Professional paragraph styling
  renderer.paragraph = (text) => {
    return `<p style="
      margin: 0 0 16px 0; 
      line-height: 1.6; 
      color: #2d3748; 
      font-size: 15px;
    ">${text}</p>`;
  };
  
  // Clean list styling
  renderer.list = (body, ordered) => {
    const tag = ordered ? 'ol' : 'ul';
    return `<${tag} style="
      margin: 16px 0;
      padding-left: 20px;
      line-height: 1.6;
      color: #2d3748;
    ">${body}</${tag}>`;
  };
  
  // Minimal blockquote styling
  renderer.blockquote = (quote) => `
    <blockquote style="
      margin: 20px 0;
      padding: 15px 20px;
      background: #f7fafc;
      border-left: 3px solid #4a5568;
      font-style: italic;
      color: #4a5568;
    ">${quote}</blockquote>`;
  
  // Clean horizontal rule
  renderer.hr = () => `
    <hr style="
      margin: 30px 0;
      border: none;
      height: 1px;
      background-color: #e2e8f0;
    ">`;
  
  // Remove image rendering to discourage visual content
  renderer.image = (href, title, alt) => `<em style="color: #718096; font-size: 14px;">[Referenced content: ${alt}]</em>`;
  
  const html = marked(md, { renderer });
  
  // Wrap in clean, professional email template
  return juice(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Strategic Brief</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
      <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="border-bottom: 2px solid #1a202c; padding: 30px 0 20px 0; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a202c; text-align: center; letter-spacing: 1px;">
            STRATEGIC BRIEF
          </h1>
          <p style="margin: 8px 0 0 0; text-align: center; color: #718096; font-size: 14px;">
            ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 0 30px;">
          ${html}
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 50px; padding: 25px 30px; border-top: 1px solid #e2e8f0; background-color: #f7fafc;">
          <p style="margin: 0; text-align: center; color: #718096; font-size: 13px;">
            Generated by Chirpmetrics • Professional newsletter intelligence
          </p>
          <p style="margin: 8px 0 0 0; text-align: center; color: #a0aec0; font-size: 12px;">
            This analysis is based on curated social media intelligence and current market research
          </p>
        </div>
      </div>
    </body>
    </html>
  `);
}
