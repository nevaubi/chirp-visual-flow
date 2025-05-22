
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to fetch tweets from Redis
async function fetchTweetsFromRedis(key: string, count: number = 50): Promise<any[]> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("Redis environment variables are not set");
  }
  
  try {
    const response = await fetch(
      `${REDIS_URL}/lrange/${encodeURIComponent(key)}/0/${count - 1}`,
      {
        headers: {
          "Authorization": `Bearer ${REDIS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Redis operation failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    const rawItems: string[] = data.result || [];
    
    // Parse tweets from JSON
    const tweets = rawItems
      .map(item => {
        try {
          // Try to parse as JSON - handle both direct format and wrapper format
          const parsed = JSON.parse(item);
          
          // If it's in the wrapper format with elements array
          if (parsed.elements && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
            try {
              return JSON.parse(parsed.elements[0]);
            } catch {
              return parsed.elements[0]; // In case it's already an object
            }
          }
          
          return parsed;
        } catch (error) {
          return null;
        }
      })
      .filter((t): t is Record<string, any> => t != null);
    
    return tweets;
  } catch (error) {
    throw error;
  }
}

// Enhanced function to format tweets for OpenAI analysis including more metadata
function formatTweetsForAnalysis(tweets: any[]): string {
  let formattedText = "";

  tweets.forEach((tweet, index) => {
    // Extract tweet data, handling both possible formats with comprehensive metadata
    const text = tweet["text of tweet"] || tweet.text || "No text available";
    const likes = tweet["Likes"] || tweet.likeCount || 0;
    const replies = tweet["Replies"] || tweet.replyCount || 0;
    const retweets = tweet["retweets"] || tweet.retweetCount || 0;
    const views = tweet["Impressions"] || tweet.viewCount || 0;
    const authorName = tweet["Twitter author name"] || tweet.author?.name || "Unknown Author";
    const authorHandle = tweet["Handle"] || tweet.author?.userName || "unknown_handle";
    const verified = tweet["Verified?"] || tweet.author?.isBlueVerified || false;
    const profilePicUrl = tweet["ProfilePic"] || tweet.author?.profilePicture || "";
    const timestamp = tweet["Timestamp"] || tweet.createdAt || new Date().toISOString();

    formattedText += `Tweet ${index + 1}:\n`;
    formattedText += `Text: ${text.replace(/https?:\/\/\S+/g, "").trim()}\n`;
    formattedText += `Author: ${authorName}\n`;
    formattedText += `Handle: @${authorHandle}\n`;
    formattedText += `Verified: ${verified ? "Yes" : "No"}\n`;
    formattedText += `Profile Picture URL: ${profilePicUrl}\n`;
    formattedText += `Timestamp: ${timestamp}\n`;
    formattedText += `Likes: ${likes}\n`;
    formattedText += `Replies: ${replies}\n`;
    formattedText += `Retweets: ${retweets}\n`;
    formattedText += `Views: ${views}\n`;
    formattedText += "---\n\n";
  });

  return formattedText;
}

// Function to analyze tweets using OpenAI - updated to include and return metadata
async function analyzeWithOpenAI(formattedTweets: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not set");
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an expert Twitter trend analyst specializing in identifying emerging patterns and topics from high-engagement tweets. Your analysis must be precise, data-driven, and immediately actionable.

Your task is to extract exactly 4 distinct trending topics from the provided tweet dataset. Each identified trend must follow the exact format specified, with no deviations.

For each trend, you will:
1. Create a concise specific 3-5 word header capturing the core topic using specific details if applicable
2. Assign a single-word specific sentiment descriptor (not just "positive" but "enthusiastic" or "skeptical")
3. Create 2 relevant sub topics bullet points for each. Sub topics are 7 words max, and must use specifics like names places products events etc
4. Extract key phrases and specific language patterns directly from relevant tweets
5. Provide concise contextual significance in 20 words or less
6. Include the EXACT UNALTERED TEXT of 3 representative source tweets that best exemplify the trend, WITH THEIR FULL METADATA

Analysis priorities:
- Higher average engagement metrics across multiple tweets
- Recurring terminology, phrases, or conceptual patterns
- Unusual engagement spikes for specific subtopics
- Novel perspectives or approaches within the identified niche

When selecting example tweets:
- Choose tweets with the highest engagement metrics for the trend
- Select tweets that clearly demonstrate the trend's key characteristics
- Copy the tweet text EXACTLY as provided in the dataset without any modifications
- Include exactly 3 example tweets per trend (no more, no less)
- Include ALL the metadata for each tweet (author name, handle, verified status, profile pic URL, timestamp, likes, replies, retweets)

Do not include citations, tweet references, asterisks, or hashtags in your analysis fields. Extract actual text phrases directly from tweets as evidence without attribution in the Details field. Keep all detail fields under 10 words maximum.

Your output must follow the exact format specified with <Trend> XML tags and no additional text.`
          },
          {
            role: 'user',
            content: `Analyze the following collection of high-performing tweets. Each tweet includes full metadata (author name, handle, verified status, profile pic URL, timestamp, engagement metrics).

<tweet dataset>
${formattedTweets}
</tweet dataset>

Based on thorough analysis of these tweets and their metrics, identify exactly 4 distinct trending topics. Present each trend in this exact format:

<Trend1>
[TOPIC HEADER: 3-5 words]
* **Sentiment:** [single specific word]
* **Context:** [Concise specific analysis, max 20 words]
* **Sub topics:** [Bullet points of two relevant sub topics of trend, each max 7 words]
*Example of Real Current Tweet1: [exact unaltered text of sourced tweet1]
*Tweet1_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
*Example of Real Current Tweet2: [exact unaltered text of sourced tweet2]
*Tweet2_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
*Example of Real Current Tweet3: [exact unaltered text of sourced tweet3]
*Tweet3_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
</Trend1>
<Trend2>
[TOPIC HEADER: 3-5 words]
* **Sentiment:** [single specific word]
* **Context:** [Concise specific analysis, max 20 words]
* **Sub topics:** [Bullet points of two relevant sub topics of trend, each max 7 words]
*Example of Real Current Tweet1: [exact unaltered text of sourced tweet1]
*Tweet1_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
*Example of Real Current Tweet2: [exact unaltered text of sourced tweet2]
*Tweet2_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
*Example of Real Current Tweet3: [exact unaltered text of sourced tweet3]
*Tweet3_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
</Trend2>
<Trend3>
[TOPIC HEADER: 3-5 words]
* **Sentiment:** [single specific word]
* **Context:** [Concise specific analysis, max 20 words]
* **Sub topics:** [Bullet points of two relevant sub topics of trend, each max 7 words]
*Example of Real Current Tweet1: [exact unaltered text of sourced tweet1]
*Tweet1_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
*Example of Real Current Tweet2: [exact unaltered text of sourced tweet2]
*Tweet2_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
*Example of Real Current Tweet3: [exact unaltered text of sourced tweet3]
*Tweet3_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
</Trend3>
<Trend4>
[TOPIC HEADER: 3-5 words]
* **Sentiment:** [single specific word]
* **Context:** [Concise specific analysis, max 20 words]
* **Sub topics:** [Bullet points of two relevant sub topics of trend, each max 7 words]
*Example of Real Current Tweet1: [exact unaltered text of sourced tweet1]
*Tweet1_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
*Example of Real Current Tweet2: [exact unaltered text of sourced tweet2]
*Tweet2_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
*Example of Real Current Tweet3: [exact unaltered text of sourced tweet3]
*Tweet3_Metadata: {"authorName": "full name", "handle": "@username", "verified": true/false, "profilePicUrl": "url", "timestamp": "ISO date", "likes": number, "replies": number, "retweets": number}
</Trend4>

For each trend, you must include the exact unmodified text of 3 tweets that best represent the trend along with their complete metadata in the JSON format specified. Choose tweets with high engagement metrics that clearly demonstrate the identified pattern. Copy the tweet text exactly as it appears in the dataset.

Do not include any introductory or concluding text. Ensure each field stays under 20 words and contains specific, meaningful insights directly derived from the dataset.`
          }
        ],
        temperature: 0.2,
        max_tokens: 5000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    throw error;
  }
}

// Function to save analysis to Redis
async function saveAnalysisToRedis(analysis: string): Promise<string> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("Redis environment variables are not set");
  }
  
  try {
    // Store the analysis string directly
    const response = await fetch(
      `${REDIS_URL}/set/trendingtopics-Politics/${encodeURIComponent(analysis)}`,
      {
        headers: {
          "Authorization": `Bearer ${REDIS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Redis save operation failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    throw error;
  }
}

// Main processing function
async function processTrends() {
  try {
    // 1. Fetch tweets from Redis
    const tweets = await fetchTweetsFromRedis("asynch-database-Politics", 50);
    
    // 2. Format tweets for analysis with enhanced metadata
    const formattedTweets = formatTweetsForAnalysis(tweets);
    
    // 3. Analyze tweets with OpenAI
    const analysis = await analyzeWithOpenAI(formattedTweets);
    
    // 4. Save analysis to Redis
    const saveResult = await saveAnalysisToRedis(analysis);
    
    return { 
      success: true, 
      timestamp: new Date().toISOString(),
      saveResult
    };
  } catch (error) {
    return { success: false, error: error.message || error.toString() };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Process in the background for edge function
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(processTrends());
    } else {
      // Fallback for environments where EdgeRuntime is not available
      await processTrends();
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Trend analysis started in the background",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message || error.toString(),
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
