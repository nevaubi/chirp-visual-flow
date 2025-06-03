import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@4.3.0";
import juice from "https://esm.sh/juice@11.0.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COLORS = {
  primaryNavy: "#142a4b",
  accentBlue: "#5774cd",
  lightBg: "#f7f9fc",
  white: "#ffffff",
  darkText: "#293041",
  subtleGray: "#6b7280",
  sectionBg: "#f8fafc",
  borderColor: "#e2e8f0"
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : "";
  console.log(`[TWIN-FOCUS-GEN] ${step}${detailsStr}`);
};

// Remove hashtags (#Word) and lone asterisks (*word*)
const sanitizePlain = (txt: string) =>
  txt
    .replace(/(^|\s)#(\w+)/g, "$1$2")      // drops the # symbol
    .replace(/\*{1}(.*?)\*{1}/g, "$1");    // converts *bold?* -> bold?

// Enhanced text cleaning function
function cleanTextForDisplay(text: string): string {
  const sanitized = sanitizePlain(text);
  return sanitized
    // Remove markdown bold markers
    .replace(/\*\*(.*?)\*\*/g, "$1")
    // Remove markdown italic markers
    .replace(/\*(.*?)\*/g, "$1")
    // Remove hashtags (already removed above, but keep for safety)
    .replace(/#{1,6}\s*/g, "")
    // Remove list markers like "- " or "* "
    .replace(/^\s*[-*+]\s*/gm, "")
    // Remove numbered list markers like "1. "
    .replace(/^\s*\d+\.\s*/gm, "")
    // Remove inline code markers `code`
    .replace(/`(.*?)`/g, "$1")
    // Remove markdown link syntax but keep link text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Clean up extra spaces and line breaks
    .replace(/\s+/g, " ")
    .trim();
}

// Enhanced content parser for better image distribution
interface ParsedSection {
  type: "header" | "focus" | "insight" | "content";
  title: string;
  content: string;
  imageUrl?: string;
  subsections?: {
    columnA?: { header: string; points: string[] };
    columnB?: { header: string; points: string[] };
    synthesis?: string;
  };
}

function parseNewsletterContent(analysisText: string): {
  hook: string;
  sections: ParsedSection[];
  images: string[];
} {
  const lines = analysisText.split("\n");
  const sections: ParsedSection[] = [];
  const images: string[] = [];
  let hook = "";
  let currentSection: ParsedSection | null = null;

  // Extract images first
  const imageRegex = /(?:RepresentativeImageURL|PhotoUrl|Image):\s*(https?:\/\/[^\s,]+)/gi;
  let imageMatch;
  while ((imageMatch = imageRegex.exec(analysisText)) !== null) {
    if (imageMatch[1] && imageMatch[1] !== "N/A" && !imageMatch[1].includes("N/A")) {
      images.push(imageMatch[1]);
    }
  }

  // Also look for markdown image syntax
  const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
  while ((imageMatch = markdownImageRegex.exec(analysisText)) !== null) {
    if (imageMatch[1] && imageMatch[1] !== "N/A") {
      images.push(imageMatch[1]);
    }
  }

  let isInMainFocus = false;
  let isInQuickInsights = false;
  let currentContent = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and markdown artifacts
    if (!line || line.startsWith("```") || line.startsWith("---")) continue;

    // Detect hook (usually early in content)
    if (
      ((line.toLowerCase().includes("hook")) ||
        (i < 10 && !line.startsWith("#") && !line.includes(":") && line.length > 30)) &&
      !hook
    ) {
      hook = cleanTextForDisplay(line.replace(/^.*?hook:?\s*/i, ""));
      continue;
    }

    // Detect main sections
    if (
      line.toLowerCase().includes("main focus") ||
      line.toLowerCase().includes("focus area")
    ) {
      isInMainFocus = true;
      isInQuickInsights = false;
      continue;
    }

    // Detect quick insights section
    if (
      line.toLowerCase().includes("quick insight") ||
      line.toLowerCase().includes("additional") ||
      line.toLowerCase().includes("brief") ||
      line.toLowerCase().includes("rapid")
    ) {
      isInMainFocus = false;
      isInQuickInsights = true;
      continue;
    }

    // Detect focus titles within main focus section
    if (
      isInMainFocus &&
      (line.includes("Focus") ||
        line.includes("FOCUS") ||
        (line.length > 20 && line.length < 100 && !line.includes(":")))
    ) {
      if (currentSection) {
        sections.push(currentSection);
      }

      const title = cleanTextForDisplay(line);
      currentSection = { type: "focus", title, content: "" };
      currentContent = "";
      continue;
    }

    // Detect insight titles within quick insights section
    if (
      isInQuickInsights &&
      (line.includes("Insight") ||
        line.includes("INSIGHT") ||
        (line.length > 15 && line.length < 80 && !line.includes(":")))
    ) {
      if (currentSection) {
        sections.push(currentSection);
      }

      const title = cleanTextForDisplay(line);
      currentSection = { type: "insight", title, content: "" };
      currentContent = "";
      continue;
    }

    // Add content to current section
    if (
      currentSection &&
      line.length > 0 &&
      !line.toLowerCase().includes("representativeimageurl")
    ) {
      const cleanLine = cleanTextForDisplay(line);
      if (cleanLine && cleanLine.length > 3) {
        currentContent += (currentContent ? " " : "") + cleanLine;
      }
    }

    // Update current section content
    if (currentSection && currentContent) {
      currentSection.content = currentContent;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Remove duplicates from images
  const uniqueImages = [...new Set(images)];

  return { hook, sections, images: uniqueImages };
}

// Enhanced HTML generation with distributed images
function generateEnhancedHTML(parsedContent: {
  hook: string;
  sections: ParsedSection[];
  images: string[];
}): string {
  const { hook, sections, images } = parsedContent;
  let imageIndex = 0;

  // Helper function to get next image
  const getNextImage = (): string | null => {
    if (imageIndex < images.length) {
      return images[imageIndex++];
    }
    return null;
  };

  // Header section
  let html = `
    <div style="text-align: center; padding: 32px 0 24px 0; border-bottom: 3px solid ${COLORS.accentBlue}; margin-bottom: 32px;">
      <h1 style="font-size: 42px; font-weight: 800; color: ${COLORS.primaryNavy}; margin: 0 0 8px 0; font-family: 'Lato', sans-serif; letter-spacing: -0.02em;">Twin Focus</h1>
      <p style="font-size: 18px; color: ${COLORS.subtleGray}; margin: 0; font-family: 'Lato', sans-serif; font-weight: 500;">${new Date().toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  )}</p>
    </div>
  `;

  // Hook section
  if (hook) {
    html += `
      <div style="background: linear-gradient(135deg, ${COLORS.lightBg} 0%, ${COLORS.sectionBg} 100%); padding: 24px; border-radius: 12px; margin-bottom: 32px; border-left: 4px solid ${COLORS.accentBlue};">
        <p style="font-size: 20px; line-height: 1.6; color: ${COLORS.darkText}; margin: 0; font-family: 'Lato', sans-serif; font-weight: 500; font-style: italic;">${hook}</p>
      </div>
    `;
  }

  // Process focus sections first
  const focusSections = sections.filter((s) => s.type === "focus");
  const insightSections = sections.filter((s) => s.type === "insight");

  // Main focus sections with distributed images
  focusSections.forEach((section, index) => {
    const image = getNextImage();

    html += `
      <div style="margin-bottom: 40px; border: 1px solid ${COLORS.borderColor}; border-radius: 16px; overflow: hidden; background: ${COLORS.white}; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: ${COLORS.primaryNavy}; padding: 20px; text-align: center;">
          <h2 style="color: ${COLORS.white}; font-size: 28px; margin: 0; font-family: 'Lato', sans-serif; font-weight: 700;">${
            section.title
          }</h2>
        </div>
        
        ${image ? `
          <div style="text-align: center; padding: 24px; background: ${COLORS.lightBg};">
            <img src="${image}" alt="Section illustration" style="max-width: 100%; max-height: 280px; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.1); border: 2px solid ${COLORS.white};">
          </div>
        ` : ""}
        
        <div style="padding: 24px;">
          <!-- Dual Column Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: ${COLORS.sectionBg}; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr>
                <th style="background: ${COLORS.accentBlue}; color: ${COLORS.white}; padding: 16px; font-size: 16px; font-weight: 600; text-align: left; width: 50%; border-right: 2px solid ${COLORS.white};">Market Perspective</th>
                <th style="background: ${COLORS.accentBlue}; color: ${COLORS.white}; padding: 16px; font-size: 16px; font-weight: 600; text-align: left; width: 50%;">Industry View</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 20px; vertical-align: top; border-right: 2px solid ${COLORS.borderColor};">
                  <div style="color: ${COLORS.darkText}; font-family: 'Lato', sans-serif; line-height: 1.6;">
                    <p style="margin: 0 0 12px 0; font-size: 15px;">Key market developments and trends driving current discussion</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px;">Supporting data points and evidence from market analysis</p>
                    <p style="margin: 0; font-size: 15px;">Implications for market participants and stakeholders</p>
                  </div>
                </td>
                <td style="padding: 20px; vertical-align: top;">
                  <div style="color: ${COLORS.darkText}; font-family: 'Lato', sans-serif; line-height: 1.6;">
                    <p style="margin: 0 0 12px 0; font-size: 15px;">Industry expert perspectives and professional insights</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px;">Alternative viewpoints and contrasting analysis</p>
                    <p style="margin: 0; font-size: 15px;">Long-term strategic considerations and outlook</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Synthesis Section -->
          <div style="background: linear-gradient(135deg, ${COLORS.white} 0%, ${COLORS.lightBg} 100%); padding: 24px; border-radius: 12px; border: 1px solid ${COLORS.borderColor};">
            <h4 style="color: ${COLORS.primaryNavy}; font-size: 18px; margin: 0 0 16px 0; font-family: 'Lato', sans-serif; font-weight: 600; display: flex; align-items: center;">
              <span style="display: inline-block; width: 6px; height: 24px; background: ${COLORS.accentBlue}; margin-right: 12px; border-radius: 3px;"></span>
              Synthesis
            </h4>
            <p style="color: ${COLORS.darkText}; line-height: 1.7; margin: 0; font-family: 'Lato', sans-serif; font-size: 16px;">${section.content}</p>
          </div>
        </div>
      </div>
    `;
  });

  // Quick insights header
  if (insightSections.length > 0) {
    html += `
      <div style="text-align: center; margin: 48px 0 32px 0;">
        <h2 style="color: ${COLORS.primaryNavy}; font-size: 32px; margin: 0 0 12px 0; font-family: 'Lato', sans-serif; font-weight: 700; position: relative; display: inline-block;">
          Quick Insights
          <span style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 60px; height: 3px; background: ${COLORS.accentBlue}; border-radius: 2px;"></span>
        </h2>
        <p style="color: ${COLORS.subtleGray}; font-size: 16px; margin: 0; font-family: 'Lato', sans-serif;">Additional perspectives and rapid insights</p>
      </div>
    `;
  }

  // Quick insights sections with remaining images
  insightSections.forEach((section, index) => {
    const image = getNextImage();

    html += `
      <div style="margin-bottom: 32px; background: ${COLORS.white}; border-radius: 12px; border: 1px solid ${COLORS.borderColor}; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="background: linear-gradient(90deg, ${COLORS.lightBg} 0%, ${COLORS.sectionBg} 100%); padding: 20px; border-bottom: 1px solid ${COLORS.borderColor};">
          <h3 style="color: ${COLORS.darkText}; font-size: 22px; margin: 0; font-family: 'Lato', sans-serif; font-weight: 600; display: flex; align-items: center;">
            <span style="display: inline-block; width: 8px; height: 8px; background: ${COLORS.accentBlue}; margin-right: 12px; border-radius: 50%;"></span>
            ${section.title}
          </h3>
        </div>
        
        <div style="padding: 24px;">
          ${image ? `
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${image}" alt="Insight illustration" style="max-width: 100%; max-height: 200px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            </div>
          ` : ""}
          
          <p style="color: ${COLORS.darkText}; line-height: 1.6; margin: 0; font-family: 'Lato', sans-serif; font-size: 15px;">${
            section.content
          }</p>
        </div>
      </div>
    `;
  });

  // Add remaining images if any (distributed in a gallery at the end if needed)
  if (imageIndex < images.length) {
    html += `
      <div style="margin-top: 40px; padding-top: 32px; border-top: 2px solid ${COLORS.borderColor};">
        <h3 style="color: ${COLORS.primaryNavy}; font-size: 24px; margin: 0 0 24px 0; font-family: 'Lato', sans-serif; font-weight: 600; text-align: center;">Additional Visual Context</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;">
    `;

    for (let i = imageIndex; i < images.length; i++) {
      html += `
        <div style="flex: 1; min-width: 200px; max-width: 300px;">
          <img src="${images[i]}" alt="Additional context" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  return html;
}

async function generateNewsletter(
  userId: string,
  selectedCount: number,
  jwt: string,
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
        "subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle",
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
        "You must have an active subscription to generate newsletters",
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
        "Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings.",
      );
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      profile.twitter_bookmark_token_expires_at &&
      profile.twitter_bookmark_token_expires_at < now
    ) {
      throw new Error(
        "Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks.",
      );
    }

    // 4) Ensure numerical_id
    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY in environment");
        const cleanHandle = profile.twitter_handle.trim().replace("@", "");
        const resp = await fetch(
          `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(
            cleanHandle,
          )}`,
          {
            method: "GET",
            headers: {
              "x-rapidapi-key": RAPIDAPI_KEY,
              "x-rapidapi-host": "twitter293.p.rapidapi.com",
            },
          },
        );
        if (!resp.ok) throw new Error(`RapidAPI returned ${resp.status}`);
        const j = await resp.json();
        if (j?.user?.result?.rest_id) {
          numericalId = j.user.result.rest_id;
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ numerical_id: numericalId })
            .eq("id", userId);
          if (updateError) console.error("Error updating numerical_id:", updateError);
        } else {
          throw new Error(
            "Could not retrieve your Twitter ID. Please try again later.",
          );
        }
      } catch (err) {
        console.error("Error fetching numerical_id:", err);
        throw new Error(
          "Could not retrieve your Twitter ID. Please try again later.",
        );
      }
    }
    if (!numericalId) {
      throw new Error(
        "Could not determine your Twitter ID. Please update your Twitter handle in settings.",
      );
    }

    // 5) Fetch bookmarks
    logStep("Fetching bookmarks", { count: selectedCount, userId: numericalId });
    const bookmarksResp = await fetch(
      `https://api.twitter.com/2/users/${numericalId}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${profile.twitter_bookmark_access_token}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!bookmarksResp.ok) {
      const text = await bookmarksResp.text();
      console.error(`Twitter API error (${bookmarksResp.status}):`, text);
      if (bookmarksResp.status === 401) {
        throw new Error(
          "Your Twitter access token is invalid. Please reconnect your Twitter bookmarks.",
        );
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
        throw new Error(
          "You don't have any bookmarks. Please save some tweets before generating a newsletter.",
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
      },
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
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try {
          dateStr = new Date(t.createdAt).toISOString().split("T")[0];
        } catch {}
        const photo = t.extendedEntities?.media?.find(
          (m: any) => m.type === "photo",
        )?.media_url_https;
        out +=
          `Tweet ${i + 1}\nID: ${t.id}\nText: ${txt}\nReplies: ${t.replyCount ||
          0}\nLikes: ${t.likeCount ||
          0}\nImpressions: ${t.viewCount ||
          0}\nDate: ${dateStr}\nAuthor: ${t.author?.name ||
          "Unknown"}\nPhotoUrl: ${photo || "N/A"}\n`;
        if (i < arr.length - 1) out += "\n---\n\n";
      });
      return out;
    }
    const formattedTweets = parseToOpenAI(apifyData);
    logStep("Formatted tweets for analysis");

    // 8) Call OpenAI for main analysis
    logStep("Calling OpenAI for Twin Focus analysis");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

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
        temperature: 0.5,
        max_tokens: 8000,
      }),
    });
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(`OpenAI API error (${openaiRes.status}):`, txt);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    const openaiJson = await openaiRes.json();
    let analysisResult = openaiJson.choices[0].message.content.trim();
    logStep("Successfully generated Twin Focus analysis");

    // 9) Topic Selection and Query Generation for Perplexity
    logStep("Selecting topics and generating search queries for Perplexity");
    const queryGenerationPrompt = `You are an expert at identifying promising themes for web search enrichment. Given a Twin Focus analysis, select up to 3 focus areas that would benefit most from additional web-based context.
TASK: Review analysis, select up to 3 focus areas (relevance, complexity, value). For each: search query (25-50 chars), enrichment goal.
FORMAT:
===
FOCUS 1: [Focus Name]
QUERY: [Search Query]
ENRICHMENT GOAL: [Goal]

FOCUS 2: [Focus Name]
QUERY: [Search Query]
ENRICHMENT GOAL: [Goal]

FOCUS 3: [Focus Name]
QUERY: [Search Query]
ENRICHMENT GOAL: [Goal]
===
TWIN FOCUS ANALYSIS:
${analysisResult}`;

    const queryGenRes = await fetch(
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
            { role: "system", content: "You are a search query optimization specialist." },
            { role: "user", content: queryGenerationPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      },
    );

    let webEnrichmentContent:
      | { focusName: string; webSummary: string; sources: any[] }[]
      | null = null;
    if (!queryGenRes.ok) {
      const txt = await queryGenRes.text();
      console.error(`OpenAI query generation error (${queryGenRes.status}):`, txt);
      logStep(
        "Failed to generate search queries, continuing without Perplexity enrichment",
      );
    } else {
      const queryGenJson = await queryGenRes.json();
      const searchQueriesText = queryGenJson.choices[0].message.content.trim();
      logStep("Successfully generated search queries", { searchQueriesText });
      const focusesToEnrich: { focus: string; query: string; goal: string }[] = [];
      const regex =
        /FOCUS \d+:\s*(.+?)\s*QUERY:\s*(.+?)\s*ENRICHMENT GOAL:\s*(.+?)(?=\n\s*FOCUS \d+:|$)/gis;
      let match;
      while ((match = regex.exec(searchQueriesText)) !== null) {
        focusesToEnrich.push({
          focus: match[1].trim(),
          query: match[2].trim(),
          goal: match[3].trim(),
        });
      }
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      if (!PERPLEXITY_API_KEY || focusesToEnrich.length === 0) {
        logStep(
          "Missing Perplexity API key or no focus areas to enrich, continuing without web enrichment",
        );
      } else {
        logStep("Making Perplexity API calls for web enrichment", {
          focusCount: focusesToEnrich.length,
        });
        const enrichmentResults: {
          focusName: string;
          webSummary: string;
          sources: any[];
        }[] = [];
        for (const focus of focusesToEnrich) {
          try {
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
                  messages: [{ role: "user", content: focus.query }],
                  temperature: 0.2,
                  max_tokens: 400,
                  search_recency_filter: "week"
                }),
              },
            );
            if (perplexityRes.ok) {
              const data = await perplexityRes.json();
              enrichmentResults.push({
                focusName: focus.focus,
                webSummary: data.choices[0].message.content,
                sources: data.citations ?? [],
              });
              logStep(`Successfully enriched focus: ${focus.focus}`);
            } else {
              console.error(
                `Perplexity API error for "${focus.query}": ${perplexityRes.status}`,
                await perplexityRes.text(),
              );
              enrichmentResults.push({
                focusName: focus.focus,
                webSummary: `[Perplexity error ${perplexityRes.status}]`,
                sources: [],
              });
            }
          } catch (err) {
            console.error(
              `Perplexity fetch failed for "${focus.query}":`,
              err,
            );
            enrichmentResults.push({
              focusName: focus.focus,
              webSummary: "[Perplexity request failed]",
              sources: [],
            });
          }
        }
        if (enrichmentResults.length > 0) {
          webEnrichmentContent = enrichmentResults;
          logStep("Web enrichment data collected");
        }
      }
    }

    // 10) Integrate Web Content
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

      const integrationRes = await fetch(
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
              {
                role: "system",
                content:
                  "You are an expert content editor, skilled at seamlessly integrating supplementary information.",
              },
              { role: "user", content: integrationPrompt },
            ],
            temperature: 0.3,
            max_tokens: 8000,
          }),
        },
      );
      if (integrationRes.ok) {
        const integrationJson = await integrationRes.json();
        finalAnalysisForMarkdown = integrationJson.choices[0].message.content.trim();
        logStep("Successfully integrated web content with Twin Focus analysis");
      } else {
        const txt = await integrationRes.text();
        console.error(
          `OpenAI integration error (${integrationRes.status}):`,
          txt
        );
        logStep(
          "Failed to integrate web content, continuing with original analysis"
        );
      }
    }

    // 11) Parse content and generate enhanced HTML
    logStep("Parsing content and generating enhanced HTML layout");
    const parsedContent = parseNewsletterContent(finalAnalysisForMarkdown);
    const enhancedHTMLBody = generateEnhancedHTML(parsedContent);

    // 12) Generate final email HTML with enhanced styling
    const emailHtml = juice(`
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      /* Reset and base styles */
      * { box-sizing: border-box; }

      /* Default styles */
      html, body {
        background: ${COLORS.lightBg} !important;
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .email-body-container-td {
        padding: 20px 0;
        background-color: ${COLORS.lightBg};
      }

      /* Enhanced responsive styles */
      @media screen and (max-width: 600px) {
        html, body, table, table[bgcolor], td, .email-body-container-td {
          background: ${COLORS.white} !important;
          background-color: ${COLORS.white} !important;
        }

        body { padding: 0 !important; margin: 0 !important; }
        .email-body-container-td { padding: 0 !important; }

        .wrapper {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          border-radius: 0 !important;
          background: ${COLORS.white} !important;
          box-shadow: none !important;
        }

        .content-body {
          padding: 16px 12px !important;
          background: ${COLORS.white} !important;
        }

        /* Mobile typography */
        h1 { font-size: 32px !important; }
        h2 { font-size: 24px !important; }
        h3 { font-size: 20px !important; }

        /* Mobile table adjustments */
        table { width: 100% !important; }
        th, td {
          display: block !important;
          width: 100% !important;
          border-right: none !important;
          border-bottom: 1px solid ${COLORS.borderColor} !important;
        }

        /* Mobile image adjustments */
        img { max-width: 100% !important; height: auto !important; }
      }

      /* Print styles */
      @media print {
        body, html {
          background: ${COLORS.white} !important;
        }
        .wrapper {
          width: 100% !important;
          max-width: none !important;
          box-shadow: none !important;
        }
        h1, h2, h3 { page-break-after: avoid; }
        img { max-width: 100% !important; }
      }
    </style>
  </head>
  <body bgcolor="${COLORS.lightBg}" style="background-color: ${COLORS.lightBg}; margin: 0; padding: 0; font-family: 'Lato', sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="${COLORS.lightBg}">
      <tr>
        <td align="center" class="email-body-container-td">
          <div class="wrapper" style="display: block; width: 100%; max-width: 700px; margin: 0 auto; background: ${COLORS.white}; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); text-align: left;">
            <div class="content-body" style="padding: 32px 28px; background: ${COLORS.white};">
              ${enhancedHTMLBody}
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td align="center" style="background-color: ${COLORS.lightBg};">
          <div style="text-align: center; padding: 32px 0 40px 0; font-family: 'Lato', sans-serif;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: ${COLORS.primaryNavy};">Powered by LetterNest</p>
            <p style="margin: 0; font-size: 14px; color: ${COLORS.subtleGray};">Professional Newsletter Generation</p>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
`);

    logStep("Enhanced Twin Focus HTML generated with distributed images and improved formatting");

    // 13) Send email via Resend
    try {
      const fromEmail =
        Deno.env.get("FROM_EMAIL") || "newsletter@newsletters.letternest.ai";
      const emailSubject = "Twin Focus: Your Newsletter from LetterNest";
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: `LetterNest <${fromEmail}>`,
        to: profile.sending_email,
        subject: emailSubject,
        html: emailHtml,
        text: finalAnalysisForMarkdown,
      });
      if (emailError) {
        console.error("Error sending email with Resend:", emailError);
        throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
      }
      logStep("Twin Focus Email sent successfully", { id: emailData?.id });
    } catch (sendErr) {
      console.error("Error sending email:", sendErr);
    }

    // 14) Save the newsletter to newsletter_storage table
    try {
      const { error: storageError } = await supabase
        .from("newsletter_storage")
        .insert({
          user_id: userId,
          markdown_text: finalAnalysisForMarkdown,
        });
      if (storageError) {
        console.error(
          "Failed to save Twin Focus newsletter to storage:",
          storageError,
        );
      } else {
        logStep("Twin Focus Newsletter successfully saved to storage");
      }
    } catch (storageErr) {
      console.error("Error saving Twin Focus newsletter to storage:", storageErr);
    }

    // 15) Update remaining generations count
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
      message: "Twin Focus newsletter generated and process initiated for email.",
      remainingGenerations:
        profile.remaining_newsletter_generations > 0
          ? profile.remaining_newsletter_generations - 1
          : 0,
      data: {
        analysisResult: finalAnalysisForMarkdown,
        markdownNewsletter: finalAnalysisForMarkdown,
        timestamp,
      },
    };
  } catch (error) {
    console.error(
      "Error in background Twin Focus newsletter generation process:",
      error,
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
        },
      );
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      jwt,
    );
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
      },
    );
  } catch (error) {
    console.error("Error in Twin Focus newsletter generation function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
