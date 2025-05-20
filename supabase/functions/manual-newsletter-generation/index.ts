import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate selectedCount
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(
        JSON.stringify({ error: "Invalid selection. Please choose 10, 20, or 30 tweets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Authenticate user
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

    // 3. Fetch and validate profile
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
        JSON.stringify({
          error:
            "Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      profile.twitter_bookmark_token_expires_at &&
      profile.twitter_bookmark_token_expires_at < now
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Ensure numerical_id
    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY in environment");

        const cleanHandle = profile.twitter_handle.trim().replace("@", "");
        const url = `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(
          cleanHandle
        )}`;
        const options = {
          method: "GET",
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "twitter293.p.rapidapi.com",
          },
        };
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`RapidAPI returned ${response.status}`);
        const apiResponse = await response.json();
        if (apiResponse?.user?.result?.rest_id) {
          numericalId = apiResponse.user.result.rest_id;
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
        JSON.stringify({
          error:
            "Could not determine your Twitter ID. Please update your Twitter handle in settings.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Fetch bookmark IDs
    const bookmarksUrl = `https://api.twitter.com/2/users/${numericalId}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`;
    const bookmarksOptions = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${profile.twitter_bookmark_access_token}`,
        "Content-Type": "application/json",
      },
    };
    const bookmarksResponse = await fetch(bookmarksUrl, bookmarksOptions);
    if (!bookmarksResponse.ok) {
      const errorText = await bookmarksResponse.text();
      console.error(`Twitter API error (${bookmarksResponse.status}):`, errorText);
      if (bookmarksResponse.status === 401) {
        return new Response(
          JSON.stringify({
            error:
              "Your Twitter access token is invalid. Please reconnect your Twitter bookmarks.",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (bookmarksResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Twitter API rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Twitter API error: ${bookmarksResponse.status}`);
    }
    const bookmarksData = await bookmarksResponse.json();
    if (!bookmarksData?.data) {
      console.error("Invalid or empty bookmark data received:", bookmarksData);
      if (bookmarksData?.meta?.result_count === 0) {
        return new Response(
          JSON.stringify({
            error:
              "You don't have any bookmarks. Please save some tweets before generating a newsletter.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to retrieve bookmarks from Twitter");
    }
    const tweetIds = bookmarksData.data.map((t) => t.id);

    // 6. Fetch detailed tweets via Apify
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) throw new Error("Missing APIFY_API_KEY environment variable");
    const apifyRequestBody = {
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
      "include:nativeretweets": false,
      lang: "en",
      maxItems: selectedCount,
      tweetIDs: tweetIds,
    };
    const apifyResponse = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyRequestBody),
      }
    );
    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error(`Apify API error (${apifyResponse.status}):`, errorText);
      throw new Error(`Apify API error: ${apifyResponse.status}`);
    }
    const apifyData = await apifyResponse.json();
    console.log("Raw Apify response:", JSON.stringify(apifyData, null, 2));

    // 7. Format tweets for OpenAI
    const parseToOpenAIFormat = (data: any) => {
      const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      let out = "";
      arr.forEach((t, i) => {
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try {
          dateStr = new Date(t.createdAt).toISOString().split("T")[0];
        } catch {}
        const photo = t.extendedEntities?.media?.find((m) => m.type === "photo")
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
    };
    const formattedTweets = parseToOpenAIFormat(apifyData);
    console.log("Formatted tweets for OpenAI:\n", formattedTweets);

    // 8. Call OpenAI
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY environment variable");

    const systemPrompt = `You are a sophisticated tweet analysis system designed to identify key topics, trends, and insights from collections of tweets. Your purpose is to transform raw tweet data into structured, insightful analysis that captures the most significant discussions and themes.

CAPABILITIES:
- Analyze collections of 30-50 tweets to identify main topics and sub-topics
- Recognize patterns, themes, and trending discussions across seemingly unrelated tweets
- Extract sentiment, contextual meaning, and significant data points
- Identify the most relevant visual content from available photo URLs
- Synthesize information into concise summaries while preserving important details
- Format output in a consistent, structured manner that highlights key insights

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
- Four bullet points highlighting the most significant aspects
- 400-word detailed explanation covering context, sentiment, key discussions, and notable perspectives
- Up to two relevant photo URLs per topic

ONE SUB-TOPIC (third most relevant discussion):
- Concise header (5-10 words)
- Three bullet points highlighting the most significant aspects
- 300-word explanation providing comprehensive context and analysis
- A notable quote either directly extracted from a tweet or referenced within the tweets
- Up to two relevant photo URLs`;

    const userPrompt = `Analyze the following collection of tweets to identify the two most prevalent main topics and one sub-topic. For each tweet, I've provided the complete metadata including engagement metrics and photo URLs where available.

For each MAIN TOPIC (2):
1. Create a concise header (5-10 words) that captures the essence of the topic
2. Provide 4 bullet points highlighting the most significant data points or aspects
3. Write a 500-word explanation that thoroughly describes the topic, including:
   - Overall context and background
   - Predominant sentiment (positive, negative, mixed, neutral)
   - Key discussions and perspectives
   - Notable trends or patterns
   - Implications or significance
4. Include up to 2 photo URLs that best represent this topic (if available)

For the SUB-TOPIC (1):
1. Create a concise header (5-10 words)
2. Provide 3 bullet points highlighting the most significant aspects
3. Write a 300-word explanation that thoroughly describes the sub-topic
4. Extract or reference a notable quote related to this sub-topic
5. Include up to 2 photo URLs that best represent this topic (if available)

Organization criteria:
- Prioritize topics based on frequency of mention, engagement metrics, and recency
- When selecting the most significant aspects for bullet points, consider uniqueness, engagement, and informational value
- When selecting photo URLs, prioritize images with higher engagement on relevant tweets

Please format your response using clear headers, consistent bullet points, and well-structured paragraphs to maximize readability.

Here is the tweet collection to analyze:

${formattedTweets}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      const errTxt = await openaiResponse.text();
      console.error(`OpenAI API error (${openaiResponse.status}):`, errTxt);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }
    const openaiData = await openaiResponse.json();
    const analysisResult = openaiData.choices[0].message.content;
    console.log("OpenAI Analysis Result:\n", analysisResult);

    // 9. Fetch and log top 5 replies per main tweet
    try {
      // Build map of main tweets
      const tweetsArr = Array.isArray(apifyData)
        ? apifyData
        : Array.isArray(apifyData.items)
        ? apifyData.items
        : [];
      const mainTextMap: Record<string, string> = {};
      tweetsArr.forEach((t) => {
        if (t.isReply === false) {
          const clean = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
          mainTextMap[t.id] = clean;
        }
      });

      const repliesRequestBody = {
        conversation_ids: tweetIds,
        max_items_per_conversation: 50,
      };
      const repliesResponse = await fetch(
        `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-reply/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(repliesRequestBody),
        }
      );
      if (repliesResponse.ok) {
        const repliesData = await repliesResponse.json();
        // Group replies under each main tweet's id
        const grouped: Record<string, any[]> = {};
        repliesData.forEach((r: any) => {
          if (r.isReply && grouped[r.conversationId]) {
            grouped[r.conversationId].push(r);
          } else if (r.isReply) {
            grouped[r.conversationId] = [r];
          }
        });

        const logs: string[] = [];
        Object.keys(mainTextMap).forEach((mainId, idx) => {
          logs.push(`Tweet ${idx + 1} text: ${mainTextMap[mainId]}`);
          const replies = grouped[mainId] || [];
          // sort by likeCount desc
          replies.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
          replies.slice(0, 5).forEach((r, i) => {
            const txt = (r.text || "").replace(/https?:\/\/\S+/g, "").trim();
            logs.push(`Top reply ${i + 1}: ${txt}`);
          });
          logs.push("---");
        });
        console.log(logs.join("\n"));
      } else {
        console.error(
          `Apify Reply API error (${repliesResponse.status}):`,
          await repliesResponse.text()
        );
      }
    } catch (replyErr) {
      console.error("Error fetching/parsing tweet replies:", replyErr);
    }

    // 10. Final store & response
    const timestamp = new Date().toISOString();
    console.log("Newsletter generation successful:", {
      userId: user.id,
      timestamp,
      tweetCount: selectedCount,
      remainingGenerations: profile.remaining_newsletter_generations,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Newsletter generated successfully",
        remainingGenerations: profile.remaining_newsletter_generations,
        data: { analysisResult, timestamp },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
