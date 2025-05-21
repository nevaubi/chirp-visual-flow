import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to store data in Redis
async function storeInRedis(key: string, value: string): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error("Redis environment variables are not set");
    return;
  }

  try {
    const response = await fetch(`${REDIS_URL}/lpush/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ "elements": [value] })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Redis operation failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    console.log(`Successfully stored data in Redis list: ${key}`);
  } catch (error) {
    console.error(`Redis storage error: ${error.message || error.toString()}`);
  }
}

// Helper function to determine media type
function determineMediaType(tweet: any): string {
  const media = tweet.extendedEntities?.media || [];
  
  if (media.length === 0) {
    return "Text only";
  }
  
  const hasVideo = media.some((m: any) => m.type === "video" || m.expanded_url?.includes("/video/"));
  if (hasVideo) {
    return "Video";
  }
  
  const hasPhoto = media.some((m: any) => m.type === "photo" || m.expanded_url?.includes("/photo/"));
  if (hasPhoto) {
    return "Photo";
  }
  
  return "Text only";
}

async function runTwitterXScraper(): Promise<any[]> {
  if (!APIFY_API_KEY) {
    throw new Error("APIFY_API_KEY environment variable is not set");
  }

  const endpoint = `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_API_KEY)}`;
  
  const params = {
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
    "filter:verified": false,
    "filter:videos": false,
    "filter:vine": false,
    "include:nativeretweets": false,
    "lang": "en",
    "list": "1905144063638073662",
    "maxItems": 50,
    "queryType": "Top",
    "within_time": "1d"
  };

  console.log("Calling Twitter scraper with params:", JSON.stringify(params));
  
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Actor call failed: ${res.status} ${res.statusText}\n${txt}`);
  }
  
  return res.json();
}

// Process tweets and store in Redis
async function processTweets(tweets: any[]): Promise<void> {
  try {
    console.log(`Processing ${tweets.length} tweets for storage`);
    const key = `asynch-database-AI`;
    
    // Process each tweet and add to Redis
    for (const tweet of tweets) {
      const mediaType = determineMediaType(tweet);
      
      // Format the tweet record - including ProfilePic
      const tweetRecord = {
        "Twitter author name": tweet.author?.name || null,
        "Handle": tweet.author?.userName || null,
        "text of tweet": tweet.text || "",
        "Media type": mediaType,
        "Tweet Url": tweet.url || null,
        "IsReply?": tweet.isReply || false,
        "ReplyTo?": tweet.isReply ? tweet.inReplyToUsername : null,
        "retweets": tweet.retweetCount || 0,
        "Replies": tweet.replyCount || 0,
        "Likes": tweet.likeCount || 0,
        "Quotes": tweet.quoteCount || 0,
        "Impressions": tweet.viewCount || 0,
        "bookmarks": tweet.bookmarkCount || 0,
        "Verified?": tweet.author?.isBlueVerified || false,
        "ProfilePic": tweet.author?.profilePicture || null,
        "location": tweet.author?.location || null,
        "followers": tweet.author?.followers || 0,
        "following": tweet.author?.following || 0,
        "Inception": tweet.extendedEntities?.media?.[0]?.additional_media_info?.source_user?.user_results?.result?.core?.created_at || null,
        "Timestamp": tweet.createdAt || null,
        "collection_timestamp": new Date().toISOString()
      };
      
      // Store in Redis - each tweet as a separate item in the list
      await storeInRedis(key, JSON.stringify(tweetRecord));
      
      // Add a small delay to avoid overwhelming Redis
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    
    console.log(`Completed processing ${tweets.length} tweets`);
  } catch (error) {
    console.error(`Error in tweet processing: ${error.message || error.toString()}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting asynchronous tweet collection process");
    
    // Run the Twitter scraper to get tweets
    const tweets = await runTwitterXScraper();
    console.log(`Retrieved ${tweets.length} tweets for processing`);
    
    // Process tweets in the background if in Edge environment
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(processTweets(tweets));
      console.log("Background processing of tweets initiated");
    } else {
      // Fallback for environments where EdgeRuntime is not available
      await processTweets(tweets);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Started processing ${tweets.length} tweets`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error in asynch-collection-AI:", error);
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
