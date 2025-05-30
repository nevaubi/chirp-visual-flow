import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.error("Missing Redis configuration");
}
if (!OPENAI_API_KEY) {
  console.error("Missing OpenAI API key");
}

// —— Version-2-style Redis fetch returning a list of JSON strings ——
async function fetchFromRedis(key: string): Promise<string[]> {
  const url = `${UPSTASH_REDIS_REST_URL}/lrange/${encodeURIComponent(key)}/0/149`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Redis error: ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json.result) ? json.result : [];
}

// —— Unchanged: call OpenAI with formatted tweets for style analysis ——
async function analyzeWithOpenAI(tweets: string[]): Promise<string> {
  const formattedTweets = tweets
    .map((t, i) => `Tweet ${i + 1} text:\n${t}`)
    .join("\n\n---\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: `You are a specialized linguistic analysis system designed to extract comprehensive writing style patterns from Twitter content. Your task is to analyze a set of top-performing tweets from a single user and identify all elements that constitute their unique voice.

Analyze the tweets with extreme attention to detail. Produce a structured text output containing all style elements organized by category. Your analysis must be exhaustive yet precise. Your output must be in this exact format:

Output Format:
  "core_vocabulary": [...],
  "frequent_phrases": [...],
  "unique_terms": [...],
  "word_choice_patterns": [...],
  "avg_sentence_length": [...],
  "sentence_structures": [...],
  "fragment_patterns": [...],
  "punctuation_patterns": [...],
  "overall_tone": [...],
  "emotional_expression": [...],
  "humor_style": [...],
  "formality_level": [...],
  "capitalization_style": [...],
  "emoji_patterns": [...],
  "text_character_lengths": [...],
  "spacing_and_line_breaks_patterns": [...],
  "unique_quirks": [...],
  "repeated_patterns": [...],
  "rhythm_markers": [...],
  "out_of_domain_adaptation": [...],
  "emotional_adaptation": [...],
  "technical_adaptation": [...],
  "longform_adaptation": [...]
Your analysis should be so precise and comprehensive that it could be used to generate new content indistinguishable from the user's actual writing.`,
        },
        {
          role: "user",
          content: `<tweet list>\n${formattedTweets}\n</tweet list>\n\nProvide a complete style analysis as specified in the system instructions.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error("OpenAI API error:", err);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // —— AUTHENTICATION (same as Version 1) ——
    const authHeader = req.headers.get("Authorization");
    let userId: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
      }
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error("JWT verification error:", error);
        throw new Error(`Authentication error: ${error.message}`);
      }
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      // Fallback to body
      let body: any;
      try {
        body = await req.json();
      } catch {
        body = {};
      }
      userId = body.userId;
      if (!userId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Authentication required — no valid token or userId provided",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // —— SUPABASE CLIENT INIT ——
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // —— FETCH TWITTER USERNAME ——
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("twitter_username")
      .eq("id", userId)
      .single();
    if (profileErr || !profile?.twitter_username) {
      throw new Error("Twitter username not found in profile");
    }
    const twitterUsername = profile.twitter_username;

    // —— FETCH RAW TWEETS FROM REDIS (Version-2 style) ——
    const rawTweets = await fetchFromRedis(`twitter_data:user:${userId}:tweets`);
    if (!rawTweets.length) {
      return new Response(
        JSON.stringify({ success: false, error: "No tweets in Redis" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // —— PARSING LOGIC (Version 2 style) ——
    const parsedTweets = rawTweets
      .map((item) => {
        try {
          const wrapper = JSON.parse(item);
          if (wrapper.elements?.[0]) {
            return JSON.parse(wrapper.elements[0]);
          }
          return wrapper;
        } catch {
          return null;
        }
      })
      .filter((t): t is Record<string, any> => !!t);

    // —— FILTER OUT REPLIES ——  
    const nonReplies = parsedTweets.filter((t) => t["IsReply?"] === false);

    // —— SORT BY LIKES ——  
    nonReplies.sort((a, b) => (b["Likes"] || 0) - (a["Likes"] || 0));

    // —— TAKE TOP 30 & EXTRACT TEXT ——  
    const top30 = nonReplies.slice(0, 30);
    const originalTexts = top30.map((t) => t["text of tweet"] || t.text || "");

    // —— STRIP OUT LINKS ——  
    const texts = originalTexts.map((t) => t.replace(/https?:\/\/\S+/g, "").trim());

    // —— LOG FINAL TWEETS ——  
    const formatted = texts
      .map((t, i) => `Tweet ${i + 1} text:\n${t}`)
      .join("\n\n---\n\n");
    console.log(`\nFinal Top 30 Tweets:\n\n${formatted}\n`);

    // —— ANALYZE WITH OPENAI ——  
    console.log("Analyzing tweets with OpenAI...");
    let styleAnalysis: string;
    try {
      styleAnalysis = await analyzeWithOpenAI(texts);
      console.log("OpenAI analysis completed successfully");

      // —— STORE RESULTS IN PROFILE ——
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          voice_profile_analysis: styleAnalysis,
          personal_tweet_dataset: formatted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
      } else {
        console.log("Voice profile stored successfully");
      }
    } catch (e: any) {
      console.error("Error during OpenAI analysis:", e);
      styleAnalysis = `Analysis error: ${e.message}`;
    }

    // —— FINAL RESPONSE ——
    return new Response(
      JSON.stringify({
        success: true,
        count: texts.length,
        tweets: texts,
        twitter_username: twitterUsername,
        userId,
        style_analysis: styleAnalysis,
        debug: {
          raw_count: rawTweets.length,
          parsed_count: parsedTweets.length,
          non_replies_count: nonReplies.length,
          top30_count: texts.length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Error in edge function:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
