
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
const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Validate selection
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(
        JSON.stringify({ error: "Invalid selection. Please choose 10, 20, or 30 tweets." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2) Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Load profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle"
      )
      .eq("id", user.id)
      .single();
    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4) Subscription & plan & tokens checks
    if (!profile.subscription_tier) {
      return new Response(
        JSON.stringify({ error: "You must have an active subscription to generate newsletters" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const hasManualPlan =
      profile.newsletter_day_preference === "Manual: 4" ||
      profile.newsletter_day_preference === "Manual: 8";
    if (!hasManualPlan) {
      return new Response(
        JSON.stringify({ error: "You must have a manual newsletter plan to use this feature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!profile.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      return new Response(
        JSON.stringify({ error: "You have no remaining newsletter generations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!profile.twitter_bookmark_access_token) {
      return new Response(
        JSON.stringify({ error: "Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const now = Math.floor(Date.now() / 1000);
    if (profile.twitter_bookmark_token_expires_at && profile.twitter_bookmark_token_expires_at < now) {
      return new Response(
        JSON.stringify({ error: "Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5) Ensure numerical_id
    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY in environment");
        const cleanHandle = profile.twitter_handle.trim().replace("@", "");
        const resp = await fetch(
          `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(cleanHandle)}`,
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
            .update({ numerical_id: numericalId })
            .eq("id", user.id);
          if (updateError) console.error("Error updating numerical_id:", updateError);
        } else {
          throw new Error("Could not retrieve your Twitter ID. Please try again later.");
        }
      } catch (err) {
        console.error("Error fetching numerical_id:", err);
        return new Response(
          JSON.stringify({ error: "Could not retrieve your Twitter ID. Please try again later." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    if (!numericalId) {
      return new Response(
        JSON.stringify({ error: "Could not determine your Twitter ID. Please update your Twitter handle in settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6) Fetch bookmarks
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
        return new Response(
          JSON.stringify({ error: "Your Twitter access token is invalid. Please reconnect your Twitter bookmarks." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (bookmarksResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Twitter API rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Twitter API error: ${bookmarksResp.status}`);
    }
    const bookmarksData = await bookmarksResp.json();
    if (!bookmarksData?.data) {
      console.error("Invalid or empty bookmark data:", bookmarksData);
      if (bookmarksData.meta?.result_count === 0) {
        return new Response(
          JSON.stringify({ error: "You don't have any bookmarks. Please save some tweets before generating a newsletter." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to retrieve bookmarks from Twitter");
    }
    const tweetIds = bookmarksData.data.map((t: any) => t.id);

    // 7) Fetch detailed tweets via Apify
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) throw new Error("Missing APIFY_API_KEY environment variable");
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
    console.log("Raw Apify response:", JSON.stringify(apifyData, null, 2));

    // 8) Format tweets for OpenAI
    function parseToOpenAI(data: any) {
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [];
      let out = "";
      arr.forEach((t: any, i: number) => {
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try {
          dateStr = new Date(t.createdAt).toISOString().split("T")[0];
        } catch {}
        const photo = t.extendedEntities?.media?.find((m: any) => m.type === "photo")
          ?.media_url_https;
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
    console.log("Formatted tweets for OpenAI:\n", formattedTweets);

    // 9) Call OpenAI for main analysis
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");

    const systemPrompt = `You are a sophisticated tweet analysis system designed to identify key topics, trends, and insights from collections of tweets. Your purpose is to transform raw tweet data into structured, insightful analysis that captures the most significant discussions and themes.

CAPABILITIES:
- Analyze collections of 30-50 tweets to identify main topics and sub-topics
- Recognize patterns, themes, and trending discussions across seemingly unrelated tweets
- Extract sentiment, contextual meaning, and significant data points
- Identify the most relevant visual content from available photo URLs
- Synthesize information into concise summaries while preserving important details and ensure accessible natural dialogue and wording
- Format output in a consistent, structured manner that highlights key insights and communicates them at a 10th grade casual speaking level

ANALYSIS METHODOLOGY:
1. Process all tweet data including text, engagement metrics (replies, likes, impressions), timestamps, and authors
2. Identify recurring themes, keywords, hashtags, and discussion topics
3. Prioritize topics based on frequency, engagement metrics, and recency
4. Extract notable quotes that best represent each identified topic
5. Select the most relevant images based on engagement and topical relevance
6. Generate comprehensive yet concise explanations that capture the essence of each topic

OUTPUT REQUIREMENTS:
For each analysis, you will produce a structured report containing:

TWO MAIN TOPICS (highest priority discussions):
- Each with a concise header (5-10 words)
- Four bullet points highlighting the most significant aspects (20 words max each)
- 200-word detailed explanation covering context, sentiment, key discussions, and notable perspectives
- Up to two relevant photo URLs per topic

ONE SUB-TOPIC (third most relevant discussion):
- Concise header (5-10 words)
- Three bullet points highlighting the most significant aspects (20 words max each)
- 100-word explanation providing comprehensive context and analysis
- A notable quote or significant statement either directly extracted from a tweet or referenced within the tweets
- Up to two relevant photo URLs`; 

    const userPrompt = `Analyze the following collection of tweets to identify the two most prevalent main topics and one sub-topic. For each tweet, I've provided the complete metadata including engagement metrics and photo URLs where available.

For each MAIN TOPIC (2):
1. Create a concise header (5-10 words) that captures the essence of the topic
2. Provide 4 bullet points highlighting the most significant data points or aspects (20 words max each)
3. Using an accessible and naturally communicating casual tone of voice, write a 200-word explanation that thoroughly describes the topic, including:
   - Overall context and background
   - Predominant sentiment (positive, negative, mixed, neutral)
   - Key discussions and perspectives
   - Notable trends or patterns
   - Implications or significance
4. Include up to 2 photo URLs that best represent this topic (if available)

For the SUB-TOPIC (1):
1. Create a concise header (5-10 words)
2. Provide 3 bullet points highlighting the most significant aspects (20 words max each)
3. Write a 100-word explanation that thoroughly describes the sub-topic using accessible naturally human sounding casual language
4. Extract or reference a notable quote or statement related to this sub-topic
5. Include up to 2 photo URLs that best represent this topic (if available)

Organization criteria:
- Prioritize topics based on frequency of mention, engagement metrics, and recency
- When selecting the most significant aspects for bullet points, consider uniqueness, engagement, and informational value
- When selecting photo URLs, prioritize images with higher engagement on relevant tweets

Here is the tweet collection to analyze:

${formattedTweets}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1000,
      }),
    });
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(`OpenAI API error (${openaiRes.status}):`, txt);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    const openaiJson = await openaiRes.json();
    const analysisResult = openaiJson.choices[0].message.content.trim();
    console.log("OpenAI Analysis Result:\n", analysisResult);

    // 10) Fetch & log top 5 replies for 7 random tweet IDs
    let discourseAnalysis = "";
    try {
      // build main-text map
      const arrTweets = Array.isArray(apifyData)
        ? apifyData
        : Array.isArray((apifyData as any).items)
        ? (apifyData as any).items
        : [];
      const mainMap: Record<string, string> = {};
      arrTweets.forEach((t: any) => {
        if (t.isReply === false) {
          mainMap[t.id] = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        }
      });

      const idsToQuery =
        tweetIds.length <= 7
          ? tweetIds
          : [...tweetIds].sort(() => Math.random() - 0.5).slice(0, 7);
      console.log("Using random tweet IDs for replies:", idsToQuery);

      const repliesRes = await fetch(
        `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-reply/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_ids: idsToQuery,
            max_items_per_conversation: 20,
          }),
        }
      );
      if (repliesRes.ok) {
        const repliesData = await repliesRes.json();
        const grouped = (repliesData as any[])
          .filter((r: any) => r.isReply)
          .reduce((acc: any, r: any) => {
            (acc[r.conversationId] ||= []).push(r);
            return acc;
          }, {});
        const outLogs: string[] = [];
        idsToQuery.forEach((mainId, idx) => {
          outLogs.push(`Tweet ${idx + 1} text: ${mainMap[mainId] || "N/A"}`);
          const reps = grouped[mainId] || [];
          reps
            .sort((a: any, b: any) => Number(b.likeCount || 0) - Number(a.likeCount || 0))
            .slice(0, 5)
            .forEach((r: any, i: number) => {
              const txt = (r.text || "").replace(/https?:\/\/\S+/g, "").trim();
              outLogs.push(`Top reply ${i + 1}: ${txt}`);
            });
          outLogs.push("---");
        });
        console.log(outLogs.join("\n"));
        const replyAnalysisData = outLogs.join("\n");

        // 11) Call OpenAI with reply data for discourse analysis
        const discourseSystemPrompt = `You are an advanced social media discourse analyzer that speaks in normal everyday style casual english...`; // same as above
        const discourseUserPrompt = `Analyze the following collection of tweets and their top replies to identify 4 underlying sentiments...`; // same as above

        const discourseOpenaiRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4.1-2025-04-14",
              messages: [
                { role: "system", content: discourseSystemPrompt },
                { role: "user", content: `${discourseUserPrompt}\n\n${replyAnalysisData}` },
              ],
              temperature: 0.4,
              max_tokens: 2000,
            }),
          }
        );
        if (discourseOpenaiRes.ok) {
          const discourseJson = await discourseOpenaiRes.json();
          discourseAnalysis = discourseJson.choices[0].message.content.trim();
          console.log("Discourse Analysis Result:\n", discourseAnalysis);
        } else {
          const errTxt = await discourseOpenaiRes.text();
          console.error(`Discourse Analysis OpenAI error (${discourseOpenaiRes.status}):`, errTxt);
          discourseAnalysis =
            "Error: Unable to generate discourse analysis. Please try again later.";
        }
      } else {
        const errTxt = await repliesRes.text();
        console.error(`Apify Reply API error (${repliesRes.status}):`, errTxt);
        discourseAnalysis = "Error: Unable to fetch tweet replies for analysis.";
      }
    } catch (err) {
      console.error("Error fetching/parsing tweet replies:", err);
      discourseAnalysis =
        "Error: Unable to process tweet replies for analysis.";
    }

    // 12) Generate Markdown formatted newsletter
    let markdownNewsletter = "";
    try {
      console.log("Starting step 12: Markdown newsletter formatting");
      const markdownSystemPrompt = `You are a professional newsletter editor who formats content...
`; // same as above
      const markdownUserPrompt = `I have two pieces of analysis content that need to be...
      
1. MAIN ANALYSIS CONTENT:
${analysisResult}

2. DISCOURSE ANALYSIS:
${discourseAnalysis}

Please format these into a single, well-structured visually appealing Markdown newsletter...
`; // same as above

      const markdownOpenaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1-2025-04-14",
            messages: [
              { role: "system", content: markdownSystemPrompt },
              { role: "user", content: markdownUserPrompt },
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        }
      );
      if (markdownOpenaiRes.ok) {
        const markdownJson = await markdownOpenaiRes.json();
        markdownNewsletter = markdownJson.choices[0].message.content.trim();
        console.log("Markdown Newsletter Generated:\n", markdownNewsletter);
      } else {
        const errorText = await markdownOpenaiRes.text();
        console.error(
          `Markdown formatting OpenAI error (${markdownOpenaiRes.status}):`,
          errorText
        );
        markdownNewsletter =
          "Error: Unable to generate markdown newsletter format. Using original analysis instead.";
      }
    } catch (err) {
      console.error("Error generating Markdown newsletter:", err);
      markdownNewsletter =
        "Error: Failed to generate markdown newsletter. Using original analysis instead.";
    }

    // 13) Generate Enhanced Markdown with UI/UX improvements
    let enhancedMarkdown = "";
    try {
      console.log("Starting step 13: Enhanced UI/UX Markdown formatting");
      const enhancedSystemPrompt = `
You are a newsletter UI/UX specialist and markdown designer...`; // same as above
      const enhancedUserPrompt = `
I'm sharing my raw markdown newsletter below. Please transform it into a visually enhanced...
${markdownNewsletter}
`; // same as above

      const enhancedOpenaiRes2 = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: enhancedSystemPrompt },
              { role: "user", content: enhancedUserPrompt },
            ],
            temperature: 0.4,
            max_tokens: 4000,
          }),
        }
      );
      if (enhancedOpenaiRes2.ok) {
        const enhancedJson2 = await enhancedOpenaiRes2.json();
        enhancedMarkdown = enhancedJson2.choices[0].message.content.trim();
        console.log("Enhanced Markdown Newsletter Generated:\n", enhancedMarkdown);
      } else {
        const errTxt = await enhancedOpenaiRes2.text();
        console.error(
          `Enhanced Markdown formatting OpenAI error (${enhancedOpenaiRes2.status}):`,
          errTxt
        );
        enhancedMarkdown =
          "Error: Unable to generate enhanced UI/UX markdown. Using regular markdown instead.";
      }
    } catch (err) {
      console.error("Error generating Enhanced UI/UX Markdown:", err);
      enhancedMarkdown =
        "Error: Failed to generate enhanced UI/UX markdown. Using regular markdown instead.";
    }

    // 14) Clean up stray text around enhanced Markdown
    function cleanMarkdown(md: string): string {
      let cleaned = md.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
      cleaned = cleaned.trim();
      const match = cleaned.match(/(^|\n)(#{1,6}\s)/);
      if (match && typeof match.index === "number") {
        cleaned = cleaned.slice(match.index).trim();
      }
      return cleaned;
    }
    const finalMarkdown = cleanMarkdown(enhancedMarkdown);

    // 15) Convert final Markdown to HTML & inline CSS
    const htmlBody = marked(finalMarkdown);
    const emailHtml = juice(`
      <body style="background:#f5f7fa;margin:0;padding:20px;">
        <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:6px;overflow:hidden;">
          <div style="padding:24px;font-family:Arial,sans-serif;line-height:1.6;color:#333;">
            ${htmlBody}
          </div>
        </div>
      </body>
    `);

    // 16) Send email via Resend
    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@bookmarker.app";
      
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: profile.sending_email,
        subject: "Your Newsletter is Here",
        html: emailHtml,
        text: finalMarkdown,
      });
      
      if (emailError) {
        console.error("Error sending email with Resend:", emailError);
        throw new Error(`Failed to send email: ${emailError.message || "Unknown error"}`);
      }
      
      console.log("Email sent successfully with Resend:", emailData);
    } catch (sendErr) {
      console.error("Error sending email:", sendErr);
      // Continue execution even if email fails - we'll still return the newsletter content
    }

    // Update remaining generations count
    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ remaining_newsletter_generations: newCount })
        .eq("id", user.id);
      
      if (updateError) {
        console.error("Failed to update remaining generations:", updateError);
      }
    }

    // Final log & response
    const timestamp = new Date().toISOString();
    console.log("Newsletter generation successful:", {
      userId: user.id,
      timestamp,
      tweetCount: selectedCount,
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Newsletter generated and emailed successfully",
        remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
        data: {
          analysisResult,
          discourseAnalysis,
          markdownNewsletter,
          enhancedMarkdown: finalMarkdown,
          timestamp,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
