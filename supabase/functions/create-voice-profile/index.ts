import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.4.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const UPSTASH_REDIS_REST_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) console.error("Missing Redis configuration");
if (!OPENAI_API_KEY) console.error("Missing OpenAI API key");

async function fetchFromRedis(userId: string): Promise<string | null> {
  const key = `twitter_data:user:${userId}:tweets`;
  const url = `${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const json = await res.json();
  return json.result ?? null;
}

async function analyzeWithOpenAI(tweets: string[]): Promise<string> {
  const formattedTweets = tweets
    .map((t, i) => `Tweet ${i + 1} text:\n${t}`)
    .join('\n\n---\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
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

  "core_vocabulary": [Array of distinctive words that form the foundation of user's lexicon],
  "frequent_phrases": [Array of recurring multi-word expressions with usage frequencies],
  "unique_terms": [Array of slang, neologisms, or unconventional word usage with explanations],
  "word_choice_patterns": [Patterns in lexical selection, preferences for certain word types],
  
  "avg_sentence_length": [Numerical average of text character length of each sentence with standard deviation],
  "sentence_structures": [Common syntactic patterns with examples],
  "fragment_patterns": [How/when the user employs sentence fragments],
  "punctuation_patterns": [Distinctive punctuation usage],
  
  "overall_tone": [Dominant emotional/attitudinal stance],
  "emotional_expression": [How emotions are conveyed, explicit vs. implicit],
  "humor_style": [Patterns in humor: sarcasm, wordplay, references, etc.],
  "formality_level": [Assessment of formality/casualness with scale and examples],
  
  "capitalization_style": [Patterns in case usage],
  "emoji_patterns": [Emoji selection, frequency, positioning, combinations],
  "text_character_lengths": [What preferred text length styles does the user like],
  "spacing_and_line_breaks_patterns": [Patterns in text formatting like spacing, lines, etc],

  "unique_quirks": [Highly distinctive stylistic markers],
  "repeated_patterns": [Any recurring structural or thematic elements],
  "rhythm_markers": [Timing, pacing, and flow characteristics],
  
  "out_of_domain_adaptation": [Guidelines for extending style to unfamiliar topics],
  "emotional_adaptation": [Guidelines for adapting style to different emotional contexts],
  "technical_adaptation": [Guidelines for maintaining style with technical content],
  "longform_adaptation": [How to scale the style to longer content formats]


Your analysis should be so precise and comprehensive that it could be used to generate new content indistinguishable from the user's actual writing.`
        },
        {
          role: "user",
          content: `<tweet list>\n${formattedTweets}\n</tweet list>\n\nProvide a complete style analysis as specified in the system instructions.`
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('OpenAI API error:', err);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  // return the raw content string (no JSON.parse here)
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // —— IMPROVED AUTH WORKFLOW ——
    const authHeader = req.headers.get('Authorization');
    let userId: string | undefined = undefined;
    
    // Extract the token from the Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Token received:', token.substring(0, 15) + '…');
      
      // Setup Supabase client to validate JWT
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Verify JWT token
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) {
          console.error('JWT verification error:', error);
          throw new Error(`Authentication error: ${error.message}`);
        }
        
        if (user) {
          userId = user.id;
          console.log('Successfully authenticated user:', userId);
        }
      } catch (authError) {
        console.error('Error during token verification:', authError);
        throw new Error('Authentication failed');
      }
    }
    
    // Fallback to body parameter if header auth failed
    if (!userId) {
      try {
        const requestBody = await req.json();
        userId = requestBody.userId;
        
        if (!userId) {
          return new Response(JSON.stringify({
            success: false, error: 'Authentication required - no valid auth token or userId provided'
          }), { status: 401, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
        }
      } catch (e) {
        return new Response(JSON.stringify({
          success: false, error: 'Invalid request body format'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
      }
    }

    // —— SUPABASE INIT ——
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase config');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Twitter handle
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('twitter_username')
      .eq('id', userId)
      .single();
    if (profileErr || !profile?.twitter_username) {
      throw new Error('Twitter username not found in profile');
    }

    const twitterUsername = profile.twitter_username;
    const rawResult = await fetchFromRedis(userId);
    if (!rawResult) {
      return new Response(JSON.stringify({
        success: false, error: 'No tweets in Redis'
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    }

    // —— IMPROVED REDIS RESPONSE PARSING ——
    console.log('Raw Redis result structure type:', typeof rawResult);
    
    // Parse the Redis response which may contain a value field
    let redisData: any;
    try {
      // If it's already an object from the previous JSON parsing, use it
      if (typeof rawResult === 'object' && rawResult !== null) {
        redisData = rawResult;
        console.log('Redis result is already an object');
      } else {
        // Otherwise try to parse it as JSON
        redisData = JSON.parse(rawResult);
        console.log('Redis result parsed from string to object');
      }
    } catch (e) {
      console.error('Error parsing Redis result:', e);
      redisData = { value: rawResult }; // Fallback treating the entire result as a value
    }
    
    // Extract tweets from the redis data
    let tweets: any[] = [];
    
    // If the Redis response contains a 'value' field that's a string, parse it
    if (redisData && typeof redisData.value === 'string') {
      try {
        console.log('Redis data has a "value" field that is a string, parsing it');
        const parsedValue = JSON.parse(redisData.value);
        if (Array.isArray(parsedValue)) {
          tweets = parsedValue;
          console.log(`Successfully parsed ${tweets.length} tweets from value field`);
        } else {
          console.error('Parsed value is not an array:', typeof parsedValue);
        }
      } catch (e) {
        console.error('Error parsing tweets from value field:', e);
      }
    }
    // If redisData is already an array, use it directly
    else if (Array.isArray(redisData)) {
      tweets = redisData;
      console.log(`Using redisData directly as it's already an array with ${tweets.length} items`);
    }
    // Try to find the tweets in common container fields
    else if (redisData && typeof redisData === 'object') {
      // Check for common container fields
      const possibleFields = ['tweets', 'data', 'items', 'results'];
      for (const field of possibleFields) {
        if (Array.isArray(redisData[field])) {
          tweets = redisData[field];
          console.log(`Found tweets in "${field}" field: ${tweets.length} items`);
          break;
        }
      }
      
      // If no tweets found in common fields, check all fields for an array
      if (tweets.length === 0) {
        for (const key in redisData) {
          if (Array.isArray(redisData[key]) && redisData[key].length > 0) {
            tweets = redisData[key];
            console.log(`Found tweets in "${key}" field: ${tweets.length} items`);
            break;
          }
        }
      }
    }
    
    // If we still don't have tweets, log error and use empty array
    if (tweets.length === 0) {
      console.error('No tweets found in Redis data. Redis raw result:', 
        typeof rawResult === 'string' ? rawResult.substring(0, 200) + '...' : JSON.stringify(rawResult).substring(0, 200) + '...');
    }
    
    console.log(`Total tweets extracted: ${tweets.length}`);
    
    // —— FILTERING & RANKING ——
    // Verify tweets structure by looking at first item
    if (tweets.length > 0) {
      console.log('First tweet structure:', JSON.stringify(tweets[0]).substring(0, 200) + '...');
    }
    
    // Filter non-replies based on the actual structure - check if it's a reply by looking at text
    const nonReplies = tweets.filter(t => 
      t && typeof t === 'object' && 
      typeof t.text === 'string' && 
      !t.text.startsWith('RT @') && 
      // Check if it doesn't start with @ (indicating a reply) or if engagement exists (safer approach)
      (!t.text.startsWith('@') || (t.engagement && Object.keys(t.engagement).length > 0))
    );
    
    console.log(`After filtering replies: ${nonReplies.length} tweets remain`);
    
    // Sort by engagement - Using the structure from the sample data
    nonReplies.sort((a, b) => {
      // First check if engagement.likes exists
      if (a.engagement?.likes !== undefined && b.engagement?.likes !== undefined) {
        return (b.engagement.likes || 0) - (a.engagement.likes || 0);
      }
      // Fall back to other possible engagement fields
      else if (a.likes !== undefined && b.likes !== undefined) {
        return (b.likes || 0) - (a.likes || 0);
      }
      // If no engagement metrics found, don't change order
      return 0;
    });
    
    // Get the top 30 tweets and extract their text
    const topTweets = nonReplies.slice(0, 30);
    const originalTexts = topTweets.map(t => t.text || '').filter(Boolean);
    
    console.log(`Selected ${originalTexts.length} top tweets for analysis`);
    
    // —— STRIP OUT LINKS FROM EACH TWEET ——
    const texts = originalTexts.map(t =>
      t.replace(/https?:\/\/\S+/g, '').trim()
    );

    // —— LOG TOP 30 ——
    const formatted = texts
      .map((t, i) => `Tweet ${i+1} text:\n${t}`)
      .join('\n\n---\n\n');
    console.log(`\nFinal Top 30 Tweets:\n\n${formatted}\n`);

    // —— ANALYZE WITH OPENAI ——
    console.log('Analyzing tweets with OpenAI...');
    let styleAnalysis: string;
    try {
      styleAnalysis = await analyzeWithOpenAI(texts);
      console.log('OpenAI analysis completed successfully');
      
      // Store the analysis AND the top tweets list in the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          voice_profile_analysis: styleAnalysis,
          personal_tweet_dataset: formatted, // Store the formatted top tweets
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating profile with voice analysis:', updateError);
      } else {
        console.log('Successfully stored voice profile analysis and top tweets in user profile');
      }
    } catch (e: any) {
      console.error('Error during OpenAI analysis:', e);
      styleAnalysis = `Analysis error: ${e.message}`;
    }

    // —— FINAL RESPONSE ——
    return new Response(JSON.stringify({
      success: true,
      count: texts.length,
      tweets: texts,
      twitter_username: twitterUsername,
      userId,
      style_analysis: styleAnalysis,
      debug: {
        raw_count: tweets.length,
        parsed_count: tweets.length,
        non_replies_count: nonReplies.length,
        top30_count: texts.length
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Error in edge function:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
