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

// Helper function for logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[NEWSLETTER-GEN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    logStep("Starting newsletter generation process");
    
    // 1) Validate selection
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle")
      .eq("id", user.id)
      .single();
      
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
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              numerical_id: numericalId
            })
            .eq("id", user.id);
            
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
    logStep("Fetching bookmarks", { count: selectedCount, userId: numericalId });
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
    
    const tweetIds = bookmarksData.data.map((t) => t.id);
    logStep("Successfully fetched bookmarks", { count: tweetIds.length });

    // 7) Fetch detailed tweets via Apify
    logStep("Fetching detailed tweet data via Apify");
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
    logStep("Successfully fetched detailed tweet data", { tweetCount: apifyData.length || 0 });

    // 8) Format tweets for OpenAI
    function parseToOpenAI(data) {
      const arr = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      let out = "";
      
      arr.forEach((t, i) => {
        const txt = (t.text || "").replace(/https?:\/\/\S+/g, "").trim();
        let dateStr = "N/A";
        try {
          dateStr = new Date(t.createdAt).toISOString().split("T")[0];
        } catch {}
        
        const photo = t.extendedEntities?.media?.find((m) => m.type === "photo")?.media_url_https;
        
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
    logStep("Formatted tweets for analysis");

    // 9) Call OpenAI for main analysis
    logStep("Calling OpenAI for initial topic analysis");
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

FIVE MAIN TOPICS (highest priority discussions):
- Each with a concise header (10-20 words)
- Four bullet points highlighting the most significant aspects (100 words max each)
- A detailed explanation of approximately 500-700 words covering context, sentiment, key discussions, and notable perspectives
- The best photo url per topic

FOUR SUB-TOPICS (additional relevant discussions):
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

For each SUB-TOPIC (4):
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
        max_tokens: 3000
      })
    });
    
    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error(`OpenAI API error (${openaiRes.status}):`, txt);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    
    const openaiJson = await openaiRes.json();
    const analysisResult = openaiJson.choices[0].message.content.trim();
    logStep("Successfully generated initial topic analysis");

    // 10) NEW STEP: Topic Selection and Query Generation for Perplexity
    logStep("Selecting topics and generating search queries for Perplexity");
    const queryGenerationPrompt = `You are an expert at identifying the most promising topics for web search enrichment from a content analysis. Given an analysis of Twitter bookmarks, select the 3 most significant topics that would benefit from additional web-based context and information.

For each selected topic, create a precise search query that will return the most relevant, current, and comprehensive information. These queries will be sent to a web search API.

TASK:
1. Review the provided content analysis
2. Select the 3 most significant topics based on:
   - Relevance to current events
   - Complexity (topics that would benefit from additional context)
   - Engagement level
   - Potential for educational value
3. For each selected topic, create:
   - A search query string (25-50 characters) optimized for web search
   - A brief explanation of what specific information would most enhance this topic

FORMAT YOUR RESPONSE AS:
===
TOPIC 1: [Topic Name]
QUERY: [Search Query]
ENRICHMENT GOAL: [What specific information or context we want to add]

TOPIC 2: [Topic Name]
QUERY: [Search Query]
ENRICHMENT GOAL: [What specific information or context we want to add]

TOPIC 3: [Topic Name]
QUERY: [Search Query]
ENRICHMENT GOAL: [What specific information or context we want to add]
===

CONTENT ANALYSIS TO REVIEW:
${analysisResult}`;

    const queryGenRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "You are a search query optimization specialist who helps select the most promising topics for enrichment and creates perfect search queries."
          },
          {
            role: "user",
            content: queryGenerationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });
    
    if (!queryGenRes.ok) {
      const txt = await queryGenRes.text();
      console.error(`OpenAI query generation error (${queryGenRes.status}):`, txt);
      logStep("Failed to generate search queries, continuing without Perplexity enrichment");
      // Continue with the original analysis rather than failing the whole process
    } else {
      const queryGenJson = await queryGenRes.json();
      const searchQueries = queryGenJson.choices[0].message.content.trim();
      logStep("Successfully generated search queries", { searchQueries });

      // 11) Perplexity API Calls for Web Enrichment
      // Parse the search queries
      const topics: { topic: string; query: string; goal: string }[] = [];
      const regex = /TOPIC \d+: (.*)\nQUERY: (.*)\nENRICHMENT GOAL: (.*?)(?=\n\nTOPIC \d+:|$)/gs;
      let match;
      
      while ((match = regex.exec(searchQueries)) !== null) {
        topics.push({
          topic: match[1].trim(),
          query: match[2].trim(),
          goal: match[3].trim()
        });
      }
      
      // Get Perplexity API key
      const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
      if (!PERPLEXITY_API_KEY) {
        logStep("Missing Perplexity API key, continuing without web enrichment");
      } else {
        logStep("Making Perplexity API calls for web enrichment", { topicsCount: topics.length });
        
        // ──────────────────────────────────────────────────────────────
// 11) Perplexity API calls — REPLACE the whole loop with this
// ──────────────────────────────────────────────────────────────
const enrichmentResults = [];

for (const topic of topics) {
  try {
    const perplexityRes = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: "sonar-pro",                 // ◀️ search-enabled model
          messages: [
            { role: "user", content: topic.query }
          ],
          temperature: 0.2,
          max_tokens: 350,

          // recency: only results from the last 7 days
          search_recency_filter: "week"
        })
      }
    );

    if (perplexityRes.ok) {
      const data = await perplexityRes.json();

      enrichmentResults.push({
        topic:      topic.topic,
        query:      topic.query,
        goal:       topic.goal,
        webContent: data.choices[0].message.content,
        sources:    data.citations ?? []           // ⬅️ updated citations field
      });

      logStep(`Successfully enriched topic: ${topic.topic}`);
    } else {
      console.error(
        `Perplexity API error for "${topic.query}":`,
        await perplexityRes.text()
      );

      enrichmentResults.push({
        topic: topic.topic,
        query: topic.query,
        goal:  topic.goal,
        webContent: `[Perplexity error ${perplexityRes.status}]`,
        sources: []
      });
    }
  } catch (err) {
    console.error(`Perplexity fetch failed for "${topic.query}":`, err);

    enrichmentResults.push({
      topic: topic.topic,
      query: topic.query,
      goal:  topic.goal,
      webContent: "[Perplexity request failed]",
      sources: []
    });
  }
}

        
        // 12) Integrate Web Content with Original Analysis
        logStep("Integrating web content with original analysis");
        
        const integrationPrompt = `You are an expert content integrator. You've been given:
1. An original analysis of Twitter bookmarks organized into main topics and sub-topics
2. Additional web-sourced information for 3 selected topics

Your task is to integrate the web-sourced information into the original analysis in a seamless, natural way that enhances the content while maintaining the original structure and flow.

INTEGRATION RULES:
- Preserve the original structure of 5 main topics and 4 sub-topics
- For the 3 topics that have additional web information, weave this information naturally into the existing content
- Add a "Web Insights" section to each enriched topic with 2-3 key points from the web search
- Include 1-2 sources as references where appropriate
- Ensure the transitions between original and new content are smooth
- Maintain a consistent tone and style throughout

ORIGINAL ANALYSIS:
${analysisResult}

WEB-SOURCED INFORMATION:
${JSON.stringify(enrichmentResults, null, 2)}

Provide the complete integrated analysis with all main topics and sub-topics, including the seamlessly integrated web-sourced information.`;
        
        const integrationRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
                content: "You are an expert content integrator who seamlessly combines original analysis with web-sourced information to create richer, more informative content."
              },
              {
                role: "user",
                content: integrationPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 4000
          })
        });
        
        if (integrationRes.ok) {
          const integrationJson = await integrationRes.json();
          const enhancedAnalysis = integrationJson.choices[0].message.content.trim();
          logStep("Successfully integrated web content with original analysis");
          // Replace the original analysis with the enhanced one
          const analysisResult = enhancedAnalysis;
        } else {
          const txt = await integrationRes.text();
          console.error(`OpenAI integration error (${integrationRes.status}):`, txt);
          logStep("Failed to integrate web content, continuing with original analysis");
          // Continue with the original analysis
        }
      }
    }

    // Assume discourseAnalysis is not needed in the new workflow
    const discourseAnalysis = "";

    // 13) Generate Markdown formatted newsletter
    let markdownNewsletter = "";
    try {
      logStep("Starting markdown newsletter formatting");
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
10. Max 2-3 images if applicable

OUTPUT:
Provide ONLY the formatted Markdown content, reworded for accessibility and natural flow, without any explanations or comments. Ensure all substantive information from the original analyses is included.`;
      
      const markdownUserPrompt = `I have analysis content that needs to be worded for better flow and accessibility, and then formatted as a beautiful visually appealing Markdown newsletter. Your task is to reformat this analysis into a comprehensive and detailed newsletter, ensuring all key information and explanations are retained and presented clearly.

MAIN ANALYSIS CONTENT:
${analysisResult}

Please format this into a single, well-structured visually appealing Markdown newsletter with the following layout:

1. Start with the first Main topic at the top
2. Use dividers, spacing, clean and visually appealing structure as needed
3. Then present a Sub-Topic section below using longer sentence descriptions rich with context 
4. Continue to use dividers, proper spacings, clean and visually appealing structures as needed
5. Present a secondary main topic with expanded details
6. Present another 1 or 2 sub topics related to the main topics with additional context for additional discussions/perspectives
7. Present another third main topic in cleanly formatted textl bullet points, proper spacing
8. Present any furthur significant findings, topics, details of interest or important backed by context and details 
9. Add a final horizontal rule divider
10. Max 2-3 images if applicable

Use proper Markdown formatting throughout:
- # for main headings
- ## for subheadings
- - for bullet points
- --- for horizontal dividers
- Appropriate spacing between sections
- Include any image URLs that were in the original content be sure to size them properly to avoid oversized images this is important
- Format quotes properly with >
- Use bold and italic formatting where it enhances readability

Create a newsletter that is visually appealing when rendered as Markdown, with consistent formatting throughout and reads with accessible language as if a real human newsletter author wrote it. Ensure all information from the provided analysis is included.`;
      
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
          logStep("Markdown newsletter generated successfully");
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

    // 14) Generate Enhanced Markdown with UI/UX improvements
    let enhancedMarkdownNewsletter = "";
    try {
      logStep("Generating enhanced UI/UX markdown");
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
            model: "gpt-4.1-2025-04-14", // Updated from chatgpt-4o-latest
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
          logStep("Enhanced UI/UX markdown newsletter generated successfully");
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

    // 15) Clean up stray text around enhanced Markdown
    function cleanMarkdown(md: string): string {
      let cleaned = md.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
      cleaned = cleaned.trim();
      const match = cleaned.match(/(^|\n)(#{1,6}\s)/);
      if (match && typeof match.index === "number") {
        cleaned = cleaned.slice(match.index).trim();
      }
      return cleaned;
    }
    
    const finalMarkdown = cleanMarkdown(enhancedMarkdownNewsletter);
    logStep("Cleaned up final markdown");

    // 16) Convert final Markdown to HTML & inline CSS
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
    
    logStep("Converted markdown to HTML with inline CSS");

    // 17) Send email via Resend
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
      
      logStep("Email sent successfully", { id: emailData?.id });
    } catch (sendErr) {
      console.error("Error sending email:", sendErr);
      // Continue with saving to database even if email fails
    }

    // 18) Save the newsletter to newsletter_storage table
    try {
      const { error: storageError } = await supabase.from('newsletter_storage').insert({
        user_id: user.id,
        markdown_text: finalMarkdown
      });
      
      if (storageError) {
        console.error("Failed to save newsletter to storage:", storageError);
      } else {
        logStep("Newsletter successfully saved to storage");
      }
    } catch (storageErr) {
      console.error("Error saving newsletter to storage:", storageErr);
    }

    // 19) Update remaining generations count
    if (profile.remaining_newsletter_generations > 0) {
      const newCount = profile.remaining_newsletter_generations - 1;
      const { error: updateError } = await supabase.from("profiles").update({
        remaining_newsletter_generations: newCount
      }).eq("id", user.id);
      
      if (updateError) {
        console.error("Failed to update remaining generations:", updateError);
      } else {
        logStep("Updated remaining generations count", { newCount });
      }
    }

    // 20) Final log & response
    const timestamp = new Date().toISOString();
    logStep("Newsletter generation successful", {
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
        discourseAnalysis, // Will be empty string
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
