
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
    const raw = await fetchFromRedis(userId);
    if (!raw) {
      return new Response(JSON.stringify({
        success: false, error: 'No tweets in Redis'
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    }

    // —— PARSING / FILTERING / RANKING ——
    // Improved parsing with proper error handling and type checking
    let tweetData: any;
    let tweets: any[] = [];
    
    try {
      tweetData = JSON.parse(raw);
      
      // Log the structure to debug
      console.log('Raw tweet data structure:', 
        typeof tweetData, 
        Array.isArray(tweetData) ? 'is array' : 'not array',
        tweetData && typeof tweetData === 'object' ? 'has keys: ' + Object.keys(tweetData).join(', ') : ''
      );
      
      // Check if tweetData is directly an array
      if (Array.isArray(tweetData)) {
        tweets = tweetData;
      } 
      // Check if tweets might be nested in a property
      else if (tweetData && typeof tweetData === 'object') {
        // Try common properties where tweets might be stored
        if (Array.isArray(tweetData.tweets)) {
          tweets = tweetData.tweets;
        } else if (Array.isArray(tweetData.data)) {
          tweets = tweetData.data;
        } else if (Array.isArray(tweetData.items)) {
          tweets = tweetData.items;
        } else if (Array.isArray(tweetData.results)) {
          tweets = tweetData.results;
        } else {
          // Last resort: find any array property
          for (const key in tweetData) {
            if (Array.isArray(tweetData[key]) && tweetData[key].length > 0) {
              tweets = tweetData[key];
              console.log(`Found tweets array in property: ${key}`);
              break;
            }
          }
        }
      }
      
      // If we still don't have an array, create an empty one
      if (!Array.isArray(tweets)) {
        console.error('Unable to extract tweets array from data, defaulting to empty array');
        tweets = [];
      }
      
      console.log(`Extracted ${tweets.length} tweets from data`);
    } catch (e) {
      console.error('Error parsing tweet data:', e);
      tweets = [];
    }

    // Ensure tweets is a valid array before filtering
    if (!Array.isArray(tweets)) {
      console.error('Tweets is not an array after parsing, defaulting to empty array');
      tweets = [];
    }

    // Safe filtering now that we're sure tweets is an array
    const nonReplies = tweets.filter(t => t && typeof t === 'object' && t['IsReply?'] === false);
    
    // Sort tweets - check if Likes property exists
    if (nonReplies.length > 0 && typeof nonReplies[0]['Likes'] !== 'undefined') {
      nonReplies.sort((a, b) => (b['Likes'] || 0) - (a['Likes'] || 0));
    } else {
      console.log('No Likes property found for sorting, using original order');
    }
    
    // Get the text safely
    const originalTexts = nonReplies.slice(0, 30).map(t => {
      if (t && typeof t === 'object' && typeof t['text of tweet'] === 'string') {
        return t['text of tweet'];
      } else if (t && typeof t === 'object' && typeof t.text === 'string') {
        return t.text;
      } else {
        console.log('Tweet missing text property:', t);
        return '';
      }
    }).filter(Boolean); // Remove empty strings

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
