
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to fetch trending topics from Redis
async function fetchTrendingTopicsFromRedis(category: string): Promise<any> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error("Redis environment variables are not set");
  }
  
  try {
    const response = await fetch(
      `${REDIS_URL}/get/trendingtopics-${category}`,
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
    if (!data.result) {
      return [];
    }
    
    // Decode the URI encoded content from Redis
    const decodedContent = decodeURIComponent(data.result);
    
    // Parse the trends from the content
    return parseTrendsFromContent(decodedContent);
  } catch (error) {
    console.error(`Error fetching trending topics for ${category}:`, error);
    throw error;
  }
}

// Function to parse trends from the Redis content
function parseTrendsFromContent(content: string): any[] {
  try {
    const trends = [];
    
    // Extract each trend section using regex
    const trendRegex = /<Trend\d+>([\s\S]*?)<\/Trend\d+>/g;
    const trendMatches = content.matchAll(trendRegex);
    
    for (const match of trendMatches) {
      const trendContent = match[1];
      
      // Extract the header/title
      const headerMatch = trendContent.match(/\[(.*?)\]/);
      const header = headerMatch ? headerMatch[1] : "Unknown Topic";
      
      // Extract sentiment
      const sentimentMatch = trendContent.match(/\*\s+\*\*Sentiment:\*\*\s+(.*?)[\r\n]/);
      const sentiment = sentimentMatch ? sentimentMatch[1] : "neutral";
      
      // Extract context
      const contextMatch = trendContent.match(/\*\s+\*\*Context:\*\*\s+(.*?)[\r\n]/);
      const context = contextMatch ? contextMatch[1] : "No context available";
      
      // Extract subtopics
      const subTopicsMatch = trendContent.match(/\*\s+\*\*Sub topics:\*\*\s+(.*?)[\r\n]/);
      let subTopics = [];
      
      if (subTopicsMatch && subTopicsMatch[1]) {
        // Split the subtopics text by bullet points or commas
        const subTopicsText = subTopicsMatch[1];
        // Extract bullet points
        const bulletMatch = subTopicsText.match(/\[([^\]]+)\]/g);
        if (bulletMatch) {
          subTopics = bulletMatch.map(bullet => bullet.replace(/[\[\]]/g, '').trim());
        } else {
          // Try comma separation
          subTopics = subTopicsText.split(/,|\n/).map(topic => topic.trim()).filter(Boolean);
        }
      }
      
      // Extract example tweets
      const tweetRegex = /\*Example of Real Current Tweet\d+:\s+(.*?)(?=\*Example|\*\*|<\/Trend|$)/gs;
      const tweetMatches = [...trendContent.matchAll(tweetRegex)];
      const exampleTweets = tweetMatches.map(tweet => tweet[1].trim());
      
      trends.push({
        header,
        sentiment,
        context,
        subTopics,
        exampleTweets
      });
    }
    
    return trends;
  } catch (error) {
    console.error("Error parsing trends:", error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    
    if (!category) {
      throw new Error("Category parameter is required");
    }
    
    const topics = await fetchTrendingTopicsFromRedis(category);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        topics,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in get-trending-topics function:", error);
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
