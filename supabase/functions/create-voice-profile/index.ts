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

async function fetchFromRedis(key: string): Promise<string[]> {
  const url = `${UPSTASH_REDIS_REST_URL}/lrange/${encodeURIComponent(key)}/0/149`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const json = await res.json();
  return json.result || [];
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
      model: "gpt-4.1-2025-04-14",
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
    // —— AUTH WORKFLOW (UNCHANGED) ——
    const authHeader = req.headers.get('Authorization');
    if (authHeader) console.log('Auth header prefix:', authHeader.substring(0,15)+'…');
    console.log('Auth object present:', !!req.auth);

    let userId = req.auth?.uid;
    let requestBody: any;
    try { requestBody = await req.json(); }
    catch { requestBody = {}; }

    if (!userId && requestBody.userId) userId = requestBody.userId;
    if (!userId) {
      return new Response(JSON.stringify({
        success: false, error: 'Authentication required'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    }

    // —— SUPABASE INIT (UNCHANGED) ——
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
    const raw = await fetchFromRedis(`${twitterUsername} - Tweet History`);
    if (!raw.length) {
      return new Response(JSON.stringify({
        success: false, error: 'No tweets in Redis'
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
    }

    // —— PARSING / FILTERING / RANKING ——
    const tweets = raw.map(item => {
      try {
        const wrapper = JSON.parse(item);
        return wrapper.elements?.[0]
          ? JSON.parse(wrapper.elements[0])
          : wrapper;
      } catch {
        return null;
      }
    }).filter(t => t);

    const nonReplies = tweets.filter(t => t['IsReply?'] === false);
    nonReplies.sort((a, b) => (b['Likes'] || 0) - (a['Likes'] || 0));
    const originalTexts = nonReplies.slice(0, 30).map(t => t['text of tweet']);

    // —— NEW: STRIP OUT LINKS FROM EACH TWEET ——
    const texts = originalTexts.map(t =>
      t.replace(/https?:\/\/\S+/g, '').trim()
    );

    // —— LOG TOP 30 (UNCHANGED) ——
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

    // —— FINAL RESPONSE (UNCHANGED) ——
    return new Response(JSON.stringify({
      success: true,
      count: texts.length,
      tweets: texts,
      twitter_username: twitterUsername,
      userId,
      style_analysis: styleAnalysis,
      debug: {
        raw_count: raw.length,
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
