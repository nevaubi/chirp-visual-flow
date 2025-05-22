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

// Fetch tweets from Redis, now supporting both list and string formats
async function fetchFromRedis(userId: string): Promise<any[]> {
  try {
    const key = `twitter_data:user:${userId}:tweets`;
    
    // First try to get tweets from Redis list using LRANGE
    const listUrl = `${UPSTASH_REDIS_REST_URL}/lrange/${encodeURIComponent(key)}/0/-1`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
    });
    
    if (!listRes.ok) {
      console.error(`Redis LRANGE error: ${listRes.status}`);
    } else {
      const listData = await listRes.json();
      
      // If we have results from LRANGE, parse each tweet and return them
      if (listData.result && Array.isArray(listData.result) && listData.result.length > 0) {
        console.log(`Found ${listData.result.length} tweets in Redis list`);
        
        // Parse each tweet from the list (each element is a JSON string)
        return listData.result.map(tweetString => {
          try {
            return JSON.parse(tweetString);
          } catch (e) {
            console.error('Error parsing tweet from Redis list:', e);
            return null;
          }
        }).filter(Boolean); // Remove any null entries from parsing failures
      }
    }
    
    // Fallback to legacy format (GET) if list is empty or doesn't exist
    console.log('No tweets found in Redis list, trying legacy format...');
    const getUrl = `${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`;
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
    });
    
    if (!getRes.ok) {
      console.error(`Redis GET error: ${getRes.status}`);
      return [];
    }
    
    const getData = await getRes.json();
    if (!getData.result) {
      console.log('No tweets found in Redis (legacy format)');
      return [];
    }
    
    // Handle legacy format (string that needs to be parsed)
    console.log('Found tweets in legacy format, parsing...');
    try {
      let parsedData;
      
      // If it's a string, parse it
      if (typeof getData.result === 'string') {
        parsedData = JSON.parse(getData.result);
      } else {
        // If it's already an object, use it directly
        parsedData = getData.result;
      }
      
      // Check if it's an array or has a common container field
      if (Array.isArray(parsedData)) {
        return parsedData;
      } else if (parsedData && typeof parsedData === 'object') {
        // Check for common container fields
        for (const field of ['tweets', 'data', 'items', 'results']) {
          if (Array.isArray(parsedData[field])) {
            return parsedData[field];
          }
        }
        
        // If no common fields found, look for any array
        for (const key in parsedData) {
          if (Array.isArray(parsedData[key])) {
            return parsedData[key];
          }
        }
      }
    } catch (e) {
      console.error('Error parsing legacy Redis data:', e);
    }
    
    // If all else fails, return empty array
    return [];
  } catch (error) {
    console.error('Error fetching from Redis:', error);
    return [];
  }
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
    
    // Fetch tweets from Redis (now supports both list and legacy formats)
    const tweets = await fetchFromRedis(userId);
    if (!tweets || tweets.length === 0) {
      return new Response(JSON.stringify({
        success: false, error: 'No tweets found in Redis'
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    }
    
    console.log(`Retrieved ${tweets.length} tweets from Redis`);
    
    // —— IMPROVED FILTERING / RANKING ——
    // Filter out replies and retweets
    const nonReplies = tweets.filter(t => {
      // Get the tweet text from any possible field name
      const tweetText = t.text || t['text of tweet'] || '';
      
      // Check if it's a reply or retweet
      const isReply = (t['IsReply?'] !== undefined) ? t['IsReply?'] : 
                      (tweetText.startsWith('@') && !hasEngagement(t));
      const isRetweet = tweetText.startsWith('RT @');
      
      return typeof tweetText === 'string' && !isRetweet && !isReply;
    });
    
    console.log(`After filtering replies: ${nonReplies.length} tweets remain`);
    
    // —— IMPROVED SORTING BY ENGAGEMENT ——
    nonReplies.sort((a, b) => {
      return getEngagementScore(b) - getEngagementScore(a);
    });
    
    // Get the top 30 tweets and extract their text
    const topTweets = nonReplies.slice(0, 30);
    const originalTexts = topTweets.map(t => {
      // Try different possible text field names
      return t['text of tweet'] || t.text || '';
    }).filter(Boolean);
    
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

// Helper functions
function hasEngagement(tweet: any): boolean {
  // Check if the tweet has any engagement
  if (tweet.engagement && Object.values(tweet.engagement).some(v => (v as number) > 0)) {
    return true;
  }
  
  // Check specific engagement fields
  return (tweet.Likes !== undefined && tweet.Likes > 0) || 
         (tweet.likes !== undefined && tweet.likes > 0) ||
         (tweet.engagement?.likes !== undefined && tweet.engagement.likes > 0);
}

function getEngagementScore(tweet: any): number {
  // Calculate engagement score from any possible field structure
  let score = 0;
  
  // Try specific field names first
  if (tweet.Likes !== undefined) score += tweet.Likes;
  else if (tweet.likes !== undefined) score += tweet.likes;
  else if (tweet.engagement?.likes !== undefined) score += tweet.engagement.likes;
  
  // Add retweets with higher weight
  if (tweet.Retweets !== undefined) score += tweet.Retweets * 2;
  else if (tweet.retweets !== undefined) score += tweet.retweets * 2;
  else if (tweet.engagement?.retweets !== undefined) score += tweet.engagement.retweets * 2;
  
  // Add replies with higher weight
  if (tweet.Replies !== undefined) score += tweet.Replies * 3;
  else if (tweet.replies !== undefined) score += tweet.replies * 3;
  else if (tweet.engagement?.replies !== undefined) score += tweet.engagement.replies * 3;
  
  return score;
}
