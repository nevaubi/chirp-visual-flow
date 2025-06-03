import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : "";
  console.log(`[NEWSLETTER-GEN] ${step}${detailsStr}`);
};

// Enhanced JSON extraction function with multiple parsing strategies
const extractAndParseJSON = (content: string): any => {
  // Strategy 1: Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockPatterns = [
    /```(?:json)?\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /`([\s\S]*?)`/,
  ];

  for (const pattern of codeBlockPatterns) {
    const match = content.match(pattern);
    if (match) {
      try {
        const extracted = match[1].trim();
        return JSON.parse(extracted);
      } catch {
        continue;
      }
    }
  }

  // Strategy 3: Find JSON-like structure by braces
  const bracePattern = /\{[\s\S]*\}/;
  const braceMatch = content.match(bracePattern);
  if (braceMatch) {
    try {
      let jsonStr = braceMatch[0];

      // Clean up common issues
      jsonStr = jsonStr
        // Fix unescaped quotes in strings
        .replace(/(['"])(.*?)\1/g, (_match, _quote, inner) => {
          const escaped = inner.replace(/"/g, '\\"').replace(/'/g, "\\'");
          return `"${escaped}"`;
        })
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, "$1")
        // Fix missing quotes around keys
        .replace(/(\w+)(\s*:)/g, '"$1"$2');

      return JSON.parse(jsonStr);
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Construct fallback structure if possible
  try {
    const hookMatch = content.match(/hook['":\s]*['"]([^'"]*)['"]/i);
    const titleMatches = content.match(/title['":\s]*['"]([^'"]*)['"]/gi);

    if (hookMatch || titleMatches) {
      const fallbackStructure = {
        hook: hookMatch ? hookMatch[1] : "Newsletter Update",
        mainSections: titleMatches
          ? titleMatches.slice(0, 3).map((match, i) => ({
              title:
                match.match(/['"]([^'"]*)['"]/)?.[1] || `Section ${i + 1}`,
              image: null,
              dualPerspective: {
                columnA: {
                  header: "Analysis",
                  points: ["Key insight 1", "Key insight 2"],
                },
                columnB: {
                  header: "Context",
                  points: ["Supporting detail 1", "Supporting detail 2"],
                },
              },
              synthesis:
                "This section provides comprehensive analysis of the trending topics.",
            }))
          : [],
        quickInsights: [
          {
            title: "Key Takeaway",
            summary: "Important insights from the analyzed content.",
            quote: null,
            image: null,
          },
        ],
      };
      return fallbackStructure;
    }
  } catch {
    // Final fallback
  }

  throw new Error("Unable to extract valid JSON from OpenAI response");
};

// Helper function to convert text to proper HTML formatting with visual breaks
const formatTextForHTML = (text: string): string => {
  if (!text) return "";

  // Split long text into paragraphs for better readability
  const sentences = text.split(/[.!?]+/);
  let formattedText = "";
  let currentParagraph = "";

  sentences.forEach((sentence, index) => {
    sentence = sentence.trim();
    if (sentence.length === 0) return;

    currentParagraph += sentence + ". ";

    // Create paragraph breaks every 2-3 sentences or at natural breaks
    if (
      (index + 1) % 3 === 0 ||
      sentence.includes("**") ||
      currentParagraph.length > 300
    ) {
      formattedText += `<p style="margin: 0 0 1.2em 0; line-height: 1.7; font-size: 16px; color: #333333; font-family: 'Inter', sans-serif;">${currentParagraph.trim()}</p>`;
      currentParagraph = "";
    }
  });

  // Add any remaining text
  if (currentParagraph.trim()) {
    formattedText += `<p style="margin: 0 0 1.2em 0; line-height: 1.7; font-size: 16px; color: #333333; font-family: 'Inter', sans-serif;">${currentParagraph.trim()}</p>`;
  }

  return formattedText
    // Convert markdown bold to HTML
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #01caa6;">$1</strong>')
    // Fix any double periods
    .replace(/\.\./g, ".");
};

// Helper function to split long synthesis text into visual sections
const createVisualSections = (synthesis: string): string => {
  const sections = synthesis.split(/\*\*(.*?)\*\*/);
  let result = "";

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;

    if (i % 2 === 1) {
      // This is a header (was between **)
      result += `
        <div style="background-color: #f8fbf7; padding: 16px; margin: 16px 0; border-left: 4px solid #01caa6; border-radius: 4px;">
          <h4 style="margin: 0 0 12px 0; color: #01caa6; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 600;">${section}</h4>
        </div>`;
    } else {
      // Regular text content
      result += formatTextForHTML(section);
    }
  }

  return result || formatTextForHTML(synthesis);
};

// Updated HTML template with improved layout, additional images in upper/mid sections, and no images at the bottom
const getNewsletterHTML = (data: any) => {
  const { hook, mainSections, quickInsights, date } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
    <xml>
      <w:WordDocument>
        <w:DontUseAdvancedTypographyReadingMail/>
      </w:WordDocument>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
        <o:AllowPNG/>
      </o:OfficeDocumentSettings>
    </xml>
  <![endif]-->
  <!-- Web Fonts for non-Outlook clients -->
  <!--[if !mso]><!-->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" type="text/css">
  <!--<![endif]-->
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #f6f6f6;
    }
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: inherit !important;
    }
    #MessageViewBody a {
      color: inherit;
      text-decoration: none;
    }
    p {
      margin: 0;
      line-height: 1.6;
      font-family: 'Inter', sans-serif;
      color: #333333;
      font-size: 16px;
    }
    h1, h2, h3, h4 {
      margin: 0;
      font-family: 'Inter', sans-serif;
      color: #1f254a;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }
    h2 {
      font-size: 22px;
      font-weight: 600;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
    }
    .button {
      display: inline-block;
      background-color: #01caa6;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      font-weight: 600;
    }
    .section-divider {
      height: 4px;
      background-color: #e0e0e0;
      margin: 24px 0;
    }
    @media (max-width: 620px) {
      .stack .column {
        display: block !important;
        width: 100% !important;
      }
      .hide-mobile {
        display: none !important;
      }
    }
  </style>
</head>

<body style="background-color: #f6f6f6; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f6f6f6; width: 100%;">
    <tr>
      <td align="center">
        <!-- Outer wrapper (centered, max-width: 600px) -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff;">
          
          <!-- 1) TOP HEADER BAR (Solid Color) -->
          <tr>
            <td style="background-color: #1f254a; padding: 16px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">Newsletter Update</h1>
              <p style="color: #d1d1d1; font-size: 14px; margin-top: 4px;">${date}</p>
            </td>
          </tr>

          <!-- 2) HOOK SECTION (Light Teal Background) -->
          <tr>
            <td style="background-color: #e8f5f3; padding: 24px;">
              <h2 style="color: #1f254a; margin-bottom: 12px;">${hook}</h2>
            </td>
          </tr>
          
          <!-- 3) SECTION DIVIDER -->
          <tr>
            <td>
              <div class="section-divider"></div>
            </td>
          </tr>

          <!-- 4) MAIN SECTIONS (Color-coded Backgrounds, Images in Upper/Mid) -->
          ${mainSections
            .map((section: any, index: number) => {
              const bgColor = index % 2 === 0 ? "#ffffff" : "#f0f8fa";
              return `
            <tr>
              <td style="background-color: ${bgColor}; padding: 24px;">
                <!-- Title + Optional Image (if provided) -->
                <h2 style="color: #1f254a; margin-bottom: 12px;">${section.title}</h2>
                ${
                  section.image
                    ? `
                  <div style="text-align: center; margin: 16px 0;">
                    <img src="${section.image}" alt="${section.title}" width="552" style="width: 100%; max-width: 552px; height: auto; border-radius: 4px; object-fit: cover;">
                  </div>
                `
                    : ""
                }
                
                <!-- Dual-Perspective Table (two columns) -->
                ${
                  section.dualPerspective
                    ? `
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; border: 2px solid #01caa6; border-radius: 4px; overflow: hidden;">
                    <tr style="background-color: #f8fbf7;">
                      <th style="width: 50%; padding: 12px; text-align: left; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600; color: #1f254a; border-right: 1px solid #01caa6;">${
                        section.dualPerspective.columnA.header
                      }</th>
                      <th style="width: 50%; padding: 12px; text-align: left; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600; color: #1f254a;">${
                        section.dualPerspective.columnB.header
                      }</th>
                    </tr>
                    <tr>
                      <td style="padding: 12px; font-family: 'Inter', sans-serif; font-size: 15px; color: #333333; vertical-align: top; border-right: 1px solid #01caa6;">
                        <ul style="margin: 0; padding-left: 18px; list-style-type: disc;">
                          ${section.dualPerspective.columnA.points
                            .map(
                              (point: string) =>
                                `<li style="margin-bottom: 8px; line-height: 1.5;">${point}</li>`
                            )
                            .join("")}
                        </ul>
                      </td>
                      <td style="padding: 12px; font-family: 'Inter', sans-serif; font-size: 15px; color: #333333; vertical-align: top;">
                        <ul style="margin: 0; padding-left: 18px; list-style-type: disc;">
                          ${section.dualPerspective.columnB.points
                            .map(
                              (point: string) =>
                                `<li style="margin-bottom: 8px; line-height: 1.5;">${point}</li>`
                            )
                            .join("")}
                        </ul>
                      </td>
                    </tr>
                  </table>
                `
                    : ""
                }

                <!-- Synthesis (broken into sub-sections if “**Header**” markers exist) -->
                <div style="margin-top: 16px; font-family: 'Inter', sans-serif; color: #333333; font-size: 16px; line-height: 1.7;">
                  ${createVisualSections(section.synthesis)}
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="section-divider"></div>
              </td>
            </tr>
            `;
            })
            .join("")}

          <!-- 5) QUICK INSIGHTS SECTION (Solid Teal Background & Cards) -->
          <tr>
            <td style="background-color: #01caa6; padding: 24px;">
              <h3 style="color: #ffffff; text-align: center; margin-bottom: 16px;">QUICK INSIGHTS</h3>
              ${quickInsights
                .map((insight: any) => `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                  <tr>
                    <td style="padding: 16px;">
                      <h3 style="color: #1f254a; margin-bottom: 8px;">${
                        insight.title
                      }</h3>
                      <!-- Summary -->
                      <div style="font-family: 'Inter', sans-serif; color: #333333; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">
                        ${formatTextForHTML(insight.summary)}
                      </div>
                      <!-- Optional Quote -->
                      ${
                        insight.quote
                          ? `
                        <blockquote style="margin: 0; padding-left: 12px; border-left: 3px solid #01caa6; font-style: italic; color: #555555; font-size: 14px;">"${
                          insight.quote
                        }"</blockquote>
                      `
                          : ""
                      }
                    </td>
                    ${
                      insight.image
                        ? `
                    <td style="width: 50%; text-align: center; padding: 16px;">
                      <img src="${insight.image}" alt="${insight.title}" width="200" style="width: 100%; max-width: 200px; height: auto; border-radius: 4px; object-fit: cover;">
                    </td>
                    `
                        : `
                    <td style="width: 50%;"></td>
                    `
                    }
                  </tr>
                </table>
              `)
                .join("")}
            </td>
          </tr>

          <!-- 6) CALL-TO-ACTION BAR (Centered Button) -->
          <tr>
            <td style="padding: 24px; text-align: center; background-color: #f0f8fa;">
              <a href="https://your-dashboard.link" class="button">Visit Your Dashboard</a>
            </td>
          </tr>

          <!-- 7) FOOTER (No Images, Minimal Text) -->
          <tr>
            <td style="background-color: #ffffff; padding: 16px 24px; text-align: center;">
              <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #888888;">
                Powered by <strong style="color: #01caa6;">LetterNest</strong><br>
                You are receiving this email because you subscribed to our newsletter.<br>
                <a href="#" style="color: #01caa6; text-decoration: none; font-weight: 600;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

async function generateNewsletter(
  userId: string,
  selectedCount: number,
  jwt: string
) {
  try {
    // 1) Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2) Load profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle"
      )
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    // 3) Subscription & plan & tokens checks
    if (!profile.subscription_tier) {
      throw new Error(
        "You must have an active subscription to generate newsletters"
      );
    }
    if (
      !profile.remaining_newsletter_generations ||
      profile.remaining_newsletter_generations <= 0
    ) {
      throw new Error("You have no remaining newsletter generations");
    }
    if (!profile.twitter_bookmark_access_token) {
      throw new Error(
        "Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings."
      );
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      profile.twitter_bookmark_token_expires_at &&
      profile.twitter_bookmark_token_expires_at < now
    ) {
      throw new Error(
        "Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks."
      );
    }

    // 4) Ensure numerical_id
    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY)
          throw new Error("Missing RAPIDAPI_KEY in environment");
        const cleanHandle = profile.twitter_handle.trim().replace("@", "");
        const resp = await fetch(
          `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(
            cleanHandle
          )}`,
          {
            method: "GET",
            headers: {
              "x-rapidapi-key": RAPIDAPI_KEY,
              "x-rapidapi-host": "twitter293.p.rapidapi.com",
            },
          }
        );
        if (!resp.ok) throw new Error(`RapidAPI returned ${resp.status}`);
        const j = await resp.json();
        if (j?.user?.result?.rest_id) {
          numericalId = j.user.result.rest_id;
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              numerical_id: numericalId,
            })
            .eq("id", userId);
          if (updateError)
            console.error("Error updating numerical_id:", updateError);
        } else {
          throw new Error(
            "Could not retrieve your Twitter ID. Please try again later."
          );
        }
      } catch (err) {
        console.error("Error fetching numerical_id:", err);
        throw new Error(
          "Could not retrieve your Twitter ID. Please try again later."
        );
      }
    }
    if (!numericalId) {
      throw new Error(
        "Could not determine your Twitter ID. Please update your Twitter handle in settings."
      );
    }

    // 5) Fetch bookmarks
    logStep("Fetching bookmarks", {
      count: selectedCount,
      userId: numericalId,
    });
    const bookmarksResp = await fetch(
      `https://api.twitter.com/2/users/${numericalId}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${profile.twitter_bookmark_access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!bookmarksResp.ok) {
      const text = await bookmarksResp.text();
      console.error(`Twitter API error (${bookmarksResp.status}):`, text);
      if (bookmarksResp.status === 401) {
        throw new Error(
          "Your Twitter access token is invalid. Please reconnect your Twitter bookmarks."
        );
      }
      if (bookmarksResp.status === 429) {
        throw new Error(
          "Twitter API rate limit exceeded. Please try again later."
        );
      }
      throw new Error(`Twitter API error: ${bookmarksResp.status}`);
    }
    const bookmarksData = await bookmarksResp.json();
    if (!bookmarksData?.data) {
      console.error("Invalid or empty bookmark data:", bookmarksData);
      if (bookmarksData.meta?.result_count === 0) {
        throw new Error(
          "You don't have any bookmarks. Please save some tweets before generating a newsletter."
        );
      }
      throw new Error("Failed to retrieve bookmarks from Twitter");
    }
    const tweetIds = bookmarksData.data.map((t: any) => t.id);
    logStep("Successfully fetched bookmarks", { count: tweetIds.length });

    // 6) Fetch detailed tweets via Apify
    logStep("Fetching detailed tweet data via Apify");
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) {
      throw new Error("Missing APIFY_API_KEY environment variable");
    }
    const apifyResp = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
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
      }
    );
    if (!apifyResp.ok) {
      const text = await apifyResp.text();
      console.error(`Apify API error (${apifyResp.status}):`, text);
      throw new Error(`Apify API error: ${apifyResp.status}`);
    }
    const apifyData = await apifyResp.json();
    logStep("Successfully fetched detailed tweet data", {
      tweetCount: apifyData.length || 0,
    });

    // 7) Format tweets for OpenAI
    function parseToOpenAI(data: any) {
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [];
      let out = "";
      arr.forEach((t, i) => {
        // <<< FIXED: use a valid regex literal here >>>
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try {
          dateStr = new Date(t.createdAt).toISOString().split("T")[0];
        } catch {}
        const photo = t.extendedEntities?.media?.find(
          (m: any) => m.type === "photo"
        )?.media_url_https;
        out +=
          `Tweet ${i + 1}\nID: ${t.id}\nText: ${txt}\nReplies: ${
            t.replyCount || 0
          }\nLikes: ${t.likeCount || 0}\nImpressions: ${
            t.viewCount || 0
          }\nDate: ${dateStr}\nAuthor: ${
            t.author?.name || "Unknown"
          }\nPhotoUrl: ${photo || "N/A"}\n`;
        if (i < arr.length - 1) out += "\n---\n\n";
      });
      return out;
    }
    const formattedTweets = parseToOpenAI(apifyData);
    logStep("Formatted tweets for analysis");

    // 8) Call OpenAI for main analysis with improved prompt
    logStep("Calling OpenAI for Twin Focus analysis");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    const analysisSystemPrompt =
      `You are an expert content strategist for newsletter creation. Your task is to analyze a collection of tweets and organize them into a structured format for a professional newsletter layout.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown formatting, no code blocks. Just pure JSON.

RESPONSE FORMAT (EXACT JSON STRUCTURE):
{
  "hook": "A compelling 1-2 sentence opener",
  "mainSections": [
    {
      "title": "Main section title",
      "image": null,
      "dualPerspective": {
        "columnA": {
          "header": "Dynamic column header",
          "points": ["point 1", "point 2", "point 3"]
        },
        "columnB": {
          "header": "Dynamic column header", 
          "points": ["point 1", "point 2", "point 3"]
        }
      },
      "synthesis": "300-500 word comprehensive synthesis connecting both perspectives"
    }
  ],
  "quickInsights": [
    {
      "title": "Insight title",
      "summary": "100-150 word detailed summary",
      "quote": null,
      "image": null
    }
  ]
}

REQUIREMENTS:
- RESPOND WITH PURE JSON ONLY
- 3-4 main sections with dual perspectives
- 2-3 quick insights
- Set image values to null (no image URLs)
- NO direct tweet quotes, IDs, or authors
- Conversational, accessible tone
- Focus on balanced, comparative analysis
- Generate meaningful column headers based on content
- Synthesis sections should be comprehensive (300-500 words each)
- Quick insight summaries should be detailed (100-150 words each)
- Use proper JSON string escaping for quotes and special characters`;

    const analysisUserPrompt =
      `Analyze the following tweet collection and generate a structured JSON response for the newsletter:

${formattedTweets}`;

    let analysisResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        logStep(`OpenAI API call attempt ${retryCount + 1}`);

        const openaiRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: analysisSystemPrompt },
                { role: "user", content: analysisUserPrompt },
              ],
              temperature: 0.3,
              max_tokens: 12000,
            }),
          }
        );

        if (!openaiRes.ok) {
          const txt = await openaiRes.text();
          console.error(`OpenAI API error (${openaiRes.status}):`, txt);
          throw new Error(`OpenAI API error: ${openaiRes.status}`);
        }

        const openaiJson = await openaiRes.json();
        const rawContent = openaiJson.choices[0].message.content.trim();

        logStep("Raw OpenAI response received", {
          length: rawContent.length,
          preview: rawContent.substring(0, 200) + "...",
        });

        // Use enhanced JSON extraction
        analysisResult = extractAndParseJSON(rawContent);
        logStep("Successfully parsed OpenAI JSON response");
        break;
      } catch (parseError) {
        retryCount++;
        console.error(
          `JSON parsing attempt ${retryCount} failed:`,
          parseError
        );

        if (retryCount >= maxRetries) {
          logStep("All JSON parsing attempts failed, using fallback structure");
          // Provide a basic fallback structure
          analysisResult = {
            hook: "Stay updated with the latest insights from your saved content.",
            mainSections: [
              {
                title: "Key Insights from Your Bookmarks",
                image: null,
                dualPerspective: {
                  columnA: {
                    header: "Main Points",
                    points: [
                      "Important trends identified",
                      "Key developments noted",
                      "Emerging patterns observed",
                    ],
                  },
                  columnB: {
                    header: "Context",
                    points: [
                      "Market implications",
                      "Industry impact",
                      "Future considerations",
                    ],
                  },
                },
                synthesis:
                  "This newsletter compilation highlights the most significant themes from your recent bookmark activity. The content reflects current market trends and important developments that warrant attention. These insights provide valuable context for understanding the broader landscape of topics you're following.",
              },
            ],
            quickInsights: [
              {
                title: "Notable Trend",
                summary:
                  "A significant pattern has emerged from your bookmark collection, indicating important shifts in the topics you're tracking. This development suggests continued evolution in the areas of your interest.",
                quote: null,
                image: null,
              },
            ],
          };
          break;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    logStep("Successfully generated Twin Focus analysis");

    // 9) Topic Selection and Query Generation for Perplexity
    logStep("Selecting topics and generating search queries for Perplexity");
    const focusesToEnrich = analysisResult.mainSections.slice(0, 3);

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (PERPLEXITY_API_KEY && focusesToEnrich.length > 0) {
      logStep("Making Perplexity API calls for web enrichment", {
        focusCount: focusesToEnrich.length,
      });

      for (const focus of focusesToEnrich) {
        try {
          const searchQuery = `${focus.title} latest news trends analysis`;
          const perplexityRes = await fetch(
            "https://api.perplexity.ai/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
              },
              body: JSON.stringify({
                model: "sonar-pro",
                messages: [{ role: "user", content: searchQuery }],
                temperature: 0.2,
                max_tokens: 1000,
              }),
            }
          );
          if (perplexityRes.ok) {
            const data = await perplexityRes.json();
            const webContent = data.choices[0].message.content;

            // Enhance synthesis with web content (full length, no truncation)
            focus.synthesis += `\n\n**Broader Context Online:** ${webContent}`;
            logStep(`Successfully enriched focus: ${focus.title}`);
          }
        } catch (err) {
          console.error(
            `Perplexity fetch failed for "${focus.title}":`,
            err
          );
        }
      }
    }

    // 10) Generate HTML email
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailHtml = getNewsletterHTML({
      hook: analysisResult.hook,
      mainSections: analysisResult.mainSections,
      quickInsights: analysisResult.quickInsights,
      date: currentDate,
    });

    logStep("Generated HTML newsletter with new template");

    // 11) Send email via Resend
    try {
      const fromEmail =
        Deno.env.get("FROM_EMAIL") ||
        "newsletter@newsletters.letternest.ai";
      const emailSubject = "Twin Focus: Your Newsletter from LetterNest";
      const { data: emailData, error: emailError } =
        await resend.emails.send({
          from: `LetterNest <${fromEmail}>`,
          to: profile.sending_email,
          subject: emailSubject,
          html: emailHtml,
          text: `${
            analysisResult.hook
          }\n\n${analysisResult.mainSections
            .map((s: any) => `${s.title}\n${s.synthesis}`)
            .join("\n\n")}`,
        });
      if (emailError) {
        console.error(
          "Error sending email with Resend:",
          emailError
        );
        throw new Error(
          `Failed to send email: ${JSON.stringify(emailError)}`
        );
      }
      logStep("Twin Focus Email sent successfully", { id: emailData?.id });
    } catch (sendErr) {
      console.error("Error sending email:", sendErr);
    }

    // 12) Save the newsletter to newsletter_storage table
    try {
      const markdownContent = `# Newsletter Update - ${currentDate}\n\n${
        analysisResult.hook
      }\n\n${
        analysisResult.mainSections
          .map((s: any) => `## ${s.title}\n\n${s.synthesis}`)
          .join("\n\n")
      }`;

      const { error: storageError } = await supabase
        .from("newsletter_storage")
        .insert({
          user_id: userId,
          markdown_text: markdownContent,
        });
      if (storageError) {
        console.error(
          "Failed to save Twin Focus newsletter to storage:",
          storageError
        );
      } else {
        logStep("Twin Focus Newsletter successfully saved to storage");
      }
    } catch (storageErr) {
      console.error(
        "Error saving Twin Focus newsletter to storage:",
        storageErr
      );
    }

    // 13) Update remaining generations count
    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          remaining_newsletter_generations: newCount,
        })
        .eq("id", userId);
      if (updateError) {
        console.error("Failed to update remaining generations:", updateError);
      } else {
        logStep("Updated remaining generations count", { newCount });
      }
    }

    // Final log & response data
    const timestamp = new Date().toISOString();
    logStep("Twin Focus newsletter generation successful", {
      userId,
      timestamp,
      tweetCount: selectedCount,
      remainingGenerations:
        profile.remaining_newsletter_generations > 0
          ? profile.remaining_newsletter_generations - 1
          : 0,
    });
    return {
      status: "success",
      message: "Twin Focus newsletter generated and sent successfully.",
      remainingGenerations:
        profile.remaining_newsletter_generations > 0
          ? profile.remaining_newsletter_generations - 1
          : 0,
      data: {
        analysisResult: analysisResult,
        timestamp,
      },
    };
  } catch (error) {
    console.error(
      "Error in background Twin Focus newsletter generation process:",
      error
    );
    return {
      status: "error",
      message:
        (error as Error).message ||
        "Internal server error during Twin Focus generation",
    };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    logStep("Starting Twin Focus newsletter generation process (HTTP)");
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(
        JSON.stringify({
          error: "Invalid selection. Please choose 10, 20, or 30 tweets.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const backgroundTask = generateNewsletter(user.id, selectedCount, jwt);
    // @ts-ignore EdgeRuntime provided in Deno Deploy / Vercel Edge functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      backgroundTask
        .then((result) => {
          logStep("Background task completed (local/fallback)", result);
        })
        .catch((err) => {
          console.error("Background task error (local/fallback):", err);
        });
    }
    return new Response(
      JSON.stringify({
        status: "processing",
        message:
          "Your Twin Focus newsletter generation has started. You will receive an email when it's ready.",
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in Twin Focus newsletter generation function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
