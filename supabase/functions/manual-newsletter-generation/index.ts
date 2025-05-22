import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@4.3.0";
import juice from "https://esm.sh/juice@11.0.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Initialize Resend client
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // 1) Validate selection
    const { selectedCount } = await req.json();
    if (!selectedCount || ![
      10,
      20,
      30
    ].includes(selectedCount)) {
      return new Response(JSON.stringify({
        error: "Invalid selection. Please choose 10, 20, or 30 tweets."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 2) Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "No authorization header"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(JSON.stringify({
        error: "Authentication failed"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 3) Load profile
    const { data: profile, error: profileError } = await supabase.from("profiles").select("subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle").eq("id", user.id).single();
    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({
        error: "Failed to fetch user profile"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 4) Subscription & plan & tokens checks
    if (!profile.subscription_tier) {
      return new Response(JSON.stringify({
        error: "You must have an active subscription to generate newsletters"
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Removed the check for newsletter_day_preference being "Manual: 4" or "Manual: 8"
    // This allows all users to generate newsletters manually regardless of their newsletter_day_preference setting
    
    if (!profile.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      return new Response(JSON.stringify({
        error: "You have no remaining newsletter generations"
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (!profile.twitter_bookmark_access_token) {
      return new Response(JSON.stringify({
        error: "Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings."
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const now = Math.floor(Date.now() / 1000);
    if (profile.twitter_bookmark_token_expires_at && profile.twitter_bookmark_token_expires_at < now) {
      return new Response(JSON.stringify({
        error: "Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks."
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 5) Ensure numerical_id
    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY in environment");
        const cleanHandle = profile.twitter_handle.trim().replace("@", "");
        const resp = await fetch(`https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(cleanHandle)}`, {
          method: "GET",
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "twitter293.p.rapidapi.com"
          }
        });
        if (!resp.ok) throw new Error(`RapidAPI returned ${resp.status}`);
        const j = await resp.json();
        if (j?.user?.result?.rest_id) {
          numericalId = j.user.result.rest_id;
          const { error: updateError } = await supabase.from("profiles").update({
            numerical_id: numericalId
          }).eq("id", user.id);
          if (updateError) console.error("Error updating numerical_id:", updateError);
        } else {
          throw new Error("Could not retrieve your Twitter ID. Please try again later.");
        }
      } catch (err) {
        console.error("Error fetching numerical_id:", err);
        return new Response(JSON.stringify({
          error: "Could not retrieve your Twitter ID. Please try again later."
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    }
    if (!numericalId) {
      return new Response(JSON.stringify({
        error: "Could not determine your Twitter ID. Please update your Twitter handle in settings."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // 6) Fetch bookmarks
    const bookmarksResp = await fetch(`https://api.twitter.com/2/users/${numericalId}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${profile.twitter_bookmark_access_token}`,
        "Content-Type": "application/json"
      }
    });
    if (!bookmarksResp.ok) {
      const text = await bookmarksResp.text();
      console.error(`Twitter API error (${bookmarksResp.status}):`, text);
      if (bookmarksResp.status === 401) {
        return new Response(JSON.stringify({
          error: "Your Twitter access token is invalid. Please reconnect your Twitter bookmarks."
        }), {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      if (bookmarksResp.status === 429) {
        return new Response(JSON.stringify({
          error: "Twitter API rate limit exceeded. Please try again later."
        }), {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      throw new Error(`Twitter API error: ${bookmarksResp.status}`);
    }
    const bookmarksData = await bookmarksResp.json();
    if (!bookmarksData?.data) {
      console.error("Invalid or empty bookmark data:", bookmarksData);
      if (bookmarksData.meta?.result_count === 0) {
        return new Response(JSON.stringify({
          error: "You don't have any bookmarks. Please save some tweets before generating a newsletter."
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      throw new Error("Failed to retrieve bookmarks from Twitter");
    }
    const tweetIds = bookmarksData.data.map((t)=>t.id);

    // 7) Fetch detailed tweets via Apify
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) throw new Error("Missing APIFY_API_KEY environment variable");
    const apifyResp = await fetch(`https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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
        tweetIDs: tweetIds
      })
    });
    if (!apifyResp.ok) {
      const text = await apifyResp.text();
      console.error(`Apify API error (${apifyResp.status}):`, text);
      throw new Error(`Apify API error: ${apifyResp.status}`);
    }
    const apifyData = await apifyResp.json();
    console.log("Raw Apify response:", JSON.stringify(apifyData, null, 2));

    // 8) Format tweets for OpenAI
    function parseToOpenAI(data) {
      const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      let out = "";
      arr.forEach((t, i)=>{
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try {
          dateStr = new Date(t.createdAt).toISOString().split("T")[0];
        } catch  {}
        const photo = t.extendedEntities?.media?.find((m)=>m.type === "photo")?.media_url_https;
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
- Synthesize information into comprehensive summaries while preserving important details and ensure accessible natural dialogue and wording
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

TWO SUB-TOPIC (third most relevant discussion):
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
    const userPrompt = `Analyze the following collection of tweets to identify the FIVE most prevalent main topics and FOUR sub-topics. For each tweet, I've provided the complete metadata including engagement metrics and photo URLs where available.

For each MAIN TOPIC (5):
1. Create a concise header (20-30 words) that captures the essence of the topic
2. Provide 4 bullet points highlighting the most significant data points or aspects (60 words max each)
3. Using an accessible and naturally communicating casual tone of voice, write a detailed explanation of approximately 500-700 words that thoroughly describes the topic, including:
   - Overall context and background
   - Predominant sentiment (positive, negative, mixed, neutral)
   - Key discussions and perspectives
   - Notable trends or patterns
   - Implications or significance
4. Include the best photo url that best represents this topic (if available)

For the SUB-TOPIC (4):
1. Create a concise header (10-20 words)
2. Provide 3 bullet points highlighting the most significant aspects (50 words max each)
3. Write a comprehensive explanation of approximately 300-400 words that thoroughly describes the sub-topic using accessible naturally human sounding casual language
4. Extract or reference a notable quote or statement related to this sub-topic
5. Include the best photo url that best represents this topic (if available)

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
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.4,
        max_tokens: 3000 // Increased from 1000
      })
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
      const arrTweets = Array.isArray(apifyData) ? apifyData : Array.isArray(apifyData.items) ? apifyData.items : [];
      const mainMap = {};
      arrTweets.forEach((t)=>{
        if (t.isReply === false) {
          mainMap[t.id] = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        }
      });
      const idsToQuery = tweetIds.length <= 10 ? tweetIds : [
        ...tweetIds
      ].sort(()=>Math.random() - 0.5).slice(0, 10);
      console.log("Using random tweet IDs for replies:", idsToQuery);
      const repliesRes = await fetch(`https://api.apify.com/v2/acts/kaitoeasyapi~twitter-reply/run-sync-get-dataset-items?token=${APIFY_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conversation_ids: idsToQuery,
          max_items_per_conversation: 20
        })
      });
      if (repliesRes.ok) {
        const repliesData = await repliesRes.json();
        const grouped = repliesData.filter((r)=>r.isReply).reduce((acc, r)=>{
          (acc[r.conversationId] ||= []).push(r);
          return acc;
        }, {});
        const outLogs = [];
        idsToQuery.forEach((mainId, idx)=>{
          outLogs.push(`Tweet ${idx + 1} text: ${mainMap[mainId] || "N/A"}`);
          const reps = grouped[mainId] || [];
          reps.sort((a, b)=>Number(b.likeCount || 0) - Number(a.likeCount || 0)).slice(0, 5).forEach((r, i)=>{
            const txt = (r.text || "").replace(/https?:\/\/\S+/g, "").trim();
            outLogs.push(`Top reply ${i + 1}: ${txt}`);
          });
          outLogs.push("---");
        });
        console.log(outLogs.join("\n"));
        const replyAnalysisData = outLogs.join("\n");

        // 11) Call OpenAI with reply data for discourse analysis
        const discourseSystemPrompt = `You are an advanced social media discourse analyzer that speaks in normal everyday style casual english, specializing in identifying underlying patterns, hidden sentiments, and emerging trends in tweet conversations. Your purpose is to uncover insights that aren't immediately obvious but reveal meaningful community perspectives and attitudes.

CORE CAPABILITIES:
- Analyze the relationship between original tweets and their replies to identify discourse patterns
- Detect sentiment shifts, contradictions, and consensus within conversation threads
- Recognize implicit biases, unstated assumptions, and community values
- Identify emerging trends, evolving opinions, and changing public sentiment
- Extract meaningful insights that reveal deeper societal or community perspectives

ANALYTICAL METHODOLOGY:
1. Parse relationships between original tweets and reply patterns
2. Identify tonal shifts, rhetorical patterns, and response clusters
3. Detect conversation dynamics including agreement/disagreement ratios, humor markers, and emotional intensity
4. Analyze linguistic patterns revealing unspoken community norms and values
5. Prioritize insights based on their revelatory value, counter-intuitiveness, and uniqueness

Your analysis should focus on discovering:
- Underlying assumptions shared within the community
- Implicit biases or frameworks revealed through response patterns
- Emerging consensus or division points that aren't explicitly stated
- Hidden values or priorities revealed through collective reactions
- Unexpected patterns that challenge surface-level interpretations

OUTPUT FRAMEWORK:
You are to output 8 high quality insights. For each insight, provide:
1. A concise, compelling header (20-30 words)
2. A detailed explanation of approximately 150-200 words that unpacks the insight with nuance, specific evidence, and contextual significance, delivered in natural, normal flowing wording spoken at an 8th grade writing level.`;
        const discourseUserPrompt = `Analyze the following collection of tweets and their top replies to identify 8 underlying sentiments, opinions, or trends that provide meaningful insights into community perspectives.

Go beyond surface-level topic identification to discover:
- Hidden assumptions or implicit values revealed in conversation patterns
- Unexpected consensus or division points across different tweets
- Emerging attitudes or shifts in sentiment not explicitly stated
- Rhetorical patterns that reveal deeper community perspectives

For each of the 8 insights:
1. Create a concise, compelling header (20-30 words) that captures the essence of the insight
2. Write a detailed explanation of approximately 150-200 words that:
   - Articulates the underlying trend or sentiment in a clear accessible wording style for everyday very casual speaking style
   - Provides specific evidence from multiple tweet conversations
   - Explains why this insight is significant
   - Addresses both what is said and what remains unsaid
   - Connects the insight to broader social or technological contexts when relevant
   - It is IMPORTANT that you deliver your output in natural normal wording spoken at an 8th grade writing level.

Analysis criteria:
- Prioritize insights that reveal something unexpected or non-obvious
- Focus on patterns across singular tweets as well as multiple tweets if applicable rather than isolated opinions
- Consider the relationship between original tweets and the nature of responses
- Pay attention to linguistic patterns, emotional markers, and conversational dynamics
- Look for contradictions between stated positions and implicit values

Please format your response with clear numbered headers and well-structured explanations spoken in an 8th grade writing level.

DO NOT MENTION SPECIFIC TWEETS OR USERNAMES, FOCUS ONLY ON DISCUSSION TOPICS, CONCEPTS AND SENTIMENTS. 

Here is the tweet collection to analyze:

${replyAnalysisData}`;
        try {
          const discourseOpenaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-4.1-2025-04-14",
              messages: [
                {
                  role: "system",
                  content: discourseSystemPrompt
                },
                {
                  role: "user",
                  content: discourseUserPrompt
                }
              ],
              temperature: 0.4,
              max_tokens: 2000 // Sufficient for 5 * 200 words + headers
            })
          });
          if (discourseOpenaiRes.ok) {
            const discourseJson = await discourseOpenaiRes.json();
            discourseAnalysis = discourseJson.choices[0].message.content;
            console.log("Discourse Analysis Result:\n", discourseAnalysis);
          } else {
            const errorText = await discourseOpenaiRes.text();
            console.error(`Discourse Analysis OpenAI error (${discourseOpenaiRes.status}):`, errorText);
            discourseAnalysis = "Error: Unable to generate discourse analysis. Please try again later.";
          }
        } catch (discourseError) {
          console.error("Error in discourse analysis API call:", discourseError);
          discourseAnalysis = "Error: Unable to generate discourse analysis due to API error.";
        }
      } else {
        console.error(`Apify Reply API error (${repliesRes.status}):`, await repliesRes.text());
        discourseAnalysis = "Error: Unable to fetch tweet replies for analysis.";
      }
    } catch (err) {
      console.error("Error fetching/parsing tweet replies:", err);
      discourseAnalysis = "Error: Unable to process tweet replies for analysis.";
    }

    // 12) Generate Markdown formatted newsletter
    let markdownNewsletter = "";
    try {
      console.log("Starting step 12: Markdown newsletter formatting");
      const markdownSystemPrompt = `You are a professional newsletter editor who formats content into clean, beautiful, visually appealing, well-structured Markdown. Your job is to take text content and format it into a beautiful newsletter that looks professional and is easy to read. Ensure all details from the input content are preserved and comprehensively formatted.

FORMAT GUIDELINES:
- Use proper Markdown syntax for headings, subheadings, bullet points, columns, dividers, colors, and horizontal rules
- Use headings (#, ##, ###) appropriately for hierarchy
- Use bullet points (-) for lists
- Use horizontal rules (---) to separate sections
- Ensure proper spacing between sections
- Maintain the original content and meaning while improving formatting
- Use bold and italic formatting where appropriate for emphasis
- Include photo URLs where they were provided in the original content
- Create a visually appealing newsletter format and reword the content to retain meaning but in more accessible language and wording style
- Use proper Markdown for links if needed
- Reword the content as if you were a professional newsletter who communicated to their loyal audience through text that read how people naturally speak, natural and authentic flow and accessible casual wording. Similar to a 9th grade writing level. 

CONTENT STRUCTURE:
1. Start with the first Main topic at the top
2. Use dividers, spacing, clean and visually appealing structure as needed
3. Then present a Sub-Topic section below using longer sentence descriptions rich with context 
4. Continue to use dividers, proper spacings, clean and visually appealing structures as needed
5. Present a secondary main topic with expanded details
6. Present another 1 or 2 sub topics related to the main topics with additional context for additional discussions/perspectives
7. Present another third main topic in cleanly formatted textl bullet points, proper spacing
8. Present any furthur significant findings, topics, details of interest or important backed by context and details 
9. Add a final horizontal rule divider
10. After a final divider, include the Discourse Analysis section but rename it to Hot Takes or Discussions or Sentiment Analysis or something similar and format it as a 2x2 grid section
11. Add proper spacing and formatting throughout
12. Max 2-3 images if applicable

OUTPUT:
Provide ONLY the formatted Markdown content, reworded for accessibility and natural flow, without any explanations or comments. Ensure all substantive information from the original analyses is included.`;
      const markdownUserPrompt = `I have two pieces of analysis content that need to be worded for better flow and accessibility, and then combined and formatted as a beautiful visually appealing Markdown newsletter. Your task is to reformat these analyses into a comprehensive and detailed newsletter, ensuring all key information and explanations are retained and presented clearly.

1. MAIN ANALYSIS CONTENT:
${analysisResult}

2. DISCOURSE ANALYSIS:
${discourseAnalysis}

Please format these into a single, well-structured visually appealing Markdown newsletter with the following layout:

1. Start with the first Main topic at the top
2. Use dividers, spacing, clean and visually appealing structure as needed
3. Then present a Sub-Topic section below using longer sentence descriptions rich with context 
4. Continue to use dividers, proper spacings, clean and visually appealing structures as needed
5. Present a secondary main topic with expanded details
6. Present another 1 or 2 sub topics related to the main topics with additional context for additional discussions/perspectives
7. Present another third main topic in cleanly formatted textl bullet points, proper spacing
8. Present any furthur significant findings, topics, details of interest or important backed by context and details 
9. Add a final horizontal rule divider
10. Include the Discourse Analysis content but rename it Hot Takes or Discussions or Sentiment Analysis or something similar and format it as a 2x2 grid section
11. Max 2-3 images if applicable

Use proper Markdown formatting throughout:
- # for main headings
- ## for subheadings
- - for bullet points
- --- for horizontal dividers
- Appropriate spacing between sections
- Include any image URLs that were in the original content be sure to size them properly to avoid oversized images this is important
- Format quotes properly with >
- Use bold and italic formatting where it enhances readability

Create a newsletter that is visually appealing when rendered as Markdown, with consistent formatting throughout and reads with accessible language as if a real human newsletter author wrote it. Ensure all information from the provided analyses is included.`;
      try {
        const markdownOpenaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4.1-2025-04-14",
            messages: [
              {
                role: "system",
                content: markdownSystemPrompt
              },
              {
                role: "user",
                content: markdownUserPrompt
              }
            ],
            temperature: 0.2,
            max_tokens: 4000
          })
        });
        if (markdownOpenaiRes.ok) {
          const markdownJson = await markdownOpenaiRes.json();
          markdownNewsletter = markdownJson.choices[0].message.content;
          console.log("Markdown Newsletter Generated:\n", markdownNewsletter);
        } else {
          const errorText = await markdownOpenaiRes.text();
          console.error(`Markdown formatting OpenAI error (${markdownOpenaiRes.status}):`, errorText);
          markdownNewsletter = "Error: Unable to generate markdown newsletter format. Using original analysis instead.";
        }
      } catch (markdownError) {
        console.error("Error in markdown formatting API call:", markdownError);
        markdownNewsletter = "Error: Unable to generate markdown newsletter format due to API error.";
      }
    } catch (err) {
      console.error("Error generating Markdown newsletter:", err);
      markdownNewsletter = "Error: Failed to generate markdown newsletter. Using original analysis instead.";
    }

    // 13) NEW STEP: Generate Enhanced Markdown with UI/UX improvements
    let enhancedMarkdownNewsletter = "";
    try {
      console.log("Starting step 13: Enhanced UI/UX Markdown formatting");
      const enhancedSystemPrompt = `
You are a newsletter UI/UX specialist and markdown designer. Your goal is to take raw newsletter markdown and output a single, **visually enhanced** markdown document that:

1. **Section headers** (H2/H3) use inline styles or HTML spans for colored accents (e.g., \`<span style="color:#0073e6">\`).  
2. **Spacing & layout**  
   - One blank line before and after headings, lists, tables, and callout boxes.  
   - Use padded \`<div style="background:#f0f4f6;padding:12px;border-radius:4px">\` blocks for key callouts.  
   - If adding images make sure to size accordingly to keep sizes proportional and correct in proper layout
   - Prioritize visually appealing structures and ease of cognitive ability for users when reading the newsletter
3. **Lists & tables**  
   - Convert any dense list into bullet points with bolded lead-ins.  
   - Where data suits it, use simple markdown tables for side-by-side comparisons make them visually appealing
4. **Color scheme hints**  
   - Headings in a consistent color shade of your choice
   - Callout backgrounds in visually appealing color schemes
   - Table headers shaded lightly for readability.  
5. **Tone & writing**  
   - Conversational, active voice, no em-dashes, 10th-grade reading level.  
   - Bold key phrases for scannability. No unnatural pauses.
   - The primary goal is visual enhancement and readability; do not shorten the substantive content of the newsletter.
6. **Exclusions**  
   - No table of contents, no page breaks or "Page X" footers.  

Produce valid markdown that renders beautifully with these enhancements, ready for email or PDF.  
`;
      const enhancedUserPrompt = `
I'm sharing my raw markdown newsletter below. Please transform it into a **visually enhanced**, user-friendly markdown newsletter:

- **No page breaks or "Page X" sections**—just a smooth scroll.  
- **Color accents:** use inline HTML/CSS spans or blocks to hint at a color scheme (headers in blue, callouts in light gray, etc.).  
- **Better spacing:** extra blank lines around headings, lists, and callout boxes. Prioritize a visually appealing and cleanly formatted beautiful newsletter
- **Bullet points & tables:** convert dense lists into concise bullets or small tables where it helps clarity.  
- **Callout boxes:** use simple HTML \`<div>\` or blockquote styling for tips or highlights.  
- **Tone & style:** keep it conversational, active voice, 10th-grade reading level, no em-dashes, no TOC. Ensure all original content is preserved.

Here is my markdown draft—please output one cohesive, styled markdown document.  

<current newsletter>
${markdownNewsletter}
</current newsletter>
`;
      try {
        const enhancedOpenaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "chatgpt-4o-latest", // As per original code
            messages: [
              {
                role: "system",
                content: enhancedSystemPrompt
              },
              {
                role: "user",
                content: enhancedUserPrompt
              }
            ],
            temperature: 0.4,
            max_tokens: 4000
          })
        });
        if (enhancedOpenaiRes.ok) {
          const enhancedJson = await enhancedOpenaiRes.json();
          enhancedMarkdownNewsletter = enhancedJson.choices[0].message.content;
          console.log("Enhanced UI/UX Markdown Newsletter Generated:\n", enhancedMarkdownNewsletter);
        } else {
          const errorText = await enhancedOpenaiRes.text();
          console.error(`Enhanced Markdown formatting OpenAI error (${enhancedOpenaiRes.status}):`, errorText);
          enhancedMarkdownNewsletter = markdownNewsletter; // Fallback
        }
      } catch (enhancedError) {
        console.error("Error in enhanced UI/UX markdown formatting API call:", enhancedError);
        enhancedMarkdownNewsletter = markdownNewsletter; // Fallback
      }
    } catch (err) {
      console.error("Error generating Enhanced UI/UX Markdown newsletter:", err);
      enhancedMarkdownNewsletter = markdownNewsletter; // Fallback
    }

    // 14) Clean up stray text around enhanced Markdown
    function cleanMarkdown(md) {
      let cleaned = md.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
      cleaned = cleaned.trim();
      const match = cleaned.match(/(^|\n)(#{1,6}\s)/);
      if (match && typeof match.index === "number") {
        cleaned = cleaned.slice(match.index).trim();
      }
      return cleaned;
    }
    const finalMarkdown = cleanMarkdown(enhancedMarkdownNewsletter);

    // 15) Convert final Markdown to HTML & inline CSS
// -----------------------------------------------
const renderer = new marked.Renderer();

// Responsive e-mail-safe image
renderer.image = (href, _title, alt) => `
  <img src="${href}"
       alt="${alt}"
       width="552"
       style="width:100%;max-width:552px;height:auto;display:block;margin:12px auto;border-radius:4px;">
`;

const htmlBody = marked(finalMarkdown, { renderer });

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
      const fromEmail = Deno.env.get("FROM_EMAIL") || "newsletter@admin.chirpmetrics.com";
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: profile.sending_email,
        subject: "Your Newsletter is Here",
        html: emailHtml,
        text: finalMarkdown
      });
      if (emailError) {
        console.error("Error sending email with Resend:", emailError);
        throw new Error(`Failed to send email: ${emailError.message || "Unknown error"}`);
      }
      console.log("Email sent successfully with Resend:", emailData);
    } catch (sendErr) {
      console.error("Error sending email:", sendErr);
    }

    // 16.5) NEW STEP: Save the newsletter to newsletter_storage table
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({
        user_id: user.id,
        markdown_text: finalMarkdown
      });
      if (storageError) {
        console.error("Failed to save newsletter to storage:", storageError);
      } else {
        console.log("Newsletter successfully saved to storage");
      }
    } catch (storageErr) {
      console.error("Error saving newsletter to storage:", storageErr);
    }

    // Update remaining generations count
    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase.from("profiles").update({
        remaining_newsletter_generations: newCount
      }).eq("id", user.id);
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
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0
    });
    return new Response(JSON.stringify({
      status: "success",
      message: "Newsletter generated and emailed successfully",
      remainingGenerations: profile.remaining_newsletter_generations > 0 ? profile.remaining_newsletter_generations - 1 : 0,
      data: {
        analysisResult,
        discourseAnalysis,
        markdownNewsletter, // Original markdown before UI/UX enhancements
        enhancedMarkdown: finalMarkdown, // UI/UX enhanced markdown
        timestamp
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
