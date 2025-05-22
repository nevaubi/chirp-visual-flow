
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
    
    // Try to decode the URI encoded content from Redis, with fallback to raw data
    let decodedContent;
    try {
      // Attempt to decode URI component
      decodedContent = decodeURIComponent(data.result);
    } catch (decodeError) {
      console.error(`Failed to decode URI component: ${decodeError.message}`);
      // Fallback to using the raw data
      decodedContent = data.result;
    }
    
    // Parse the trends from the content
    return parseTrendsFromContent(decodedContent);
  } catch (error) {
    console.error(`Error fetching trending topics for ${category}:`, error);
    throw error;
  }
}

// Updated to parse real tweet metadata from OpenAI response
function parseTrendsFromContent(content: string): any[] {
  try {
    const trends = [];
    
    // Defensive check for empty or invalid content
    if (!content || typeof content !== 'string') {
      console.log("Empty or invalid content received:", content);
      return [];
    }
    
    // Log the first 200 characters of content for debugging
    console.log(`Content preview (first 200 chars): ${content.substring(0, 200)}...`);
    
    // Extract each trend section using regex
    const trendRegex = /<Trend\d+>([\s\S]*?)<\/Trend\d+>/g;
    const trendMatches = content.matchAll(trendRegex);
    
    // Track if we found any matches
    let matchFound = false;
    
    for (const match of trendMatches) {
      matchFound = true;
      const trendContent = match[1];
      
      // Improved header extraction with multiple patterns
      let header = "Unknown Topic";
      
      // First try standard header format with brackets
      const headerMatch = trendContent.match(/\[(.*?)\]/);
      if (headerMatch && headerMatch[1] && headerMatch[1].trim().length > 0) {
        header = headerMatch[1].trim();
      } else {
        // Try to find the first meaningful line as header
        const lines = trendContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length > 0) {
          // Remove markdown symbols and other formatting from the first line
          const firstLine = lines[0].replace(/\*/g, '').replace(/\[|\]/g, '').replace(/^#+\s+/, '').trim();
          if (firstLine.length > 0) {
            header = firstLine;
          }
        }
      }
      
      // Extract sentiment
      const sentimentMatch = trendContent.match(/\*\s+\*\*Sentiment:\*\*\s+(.*?)[\r\n]/);
      const sentiment = sentimentMatch ? sentimentMatch[1] : "neutral";
      
      // Extract context
      const contextMatch = trendContent.match(/\*\s+\*\*Context:\*\*\s+(.*?)[\r\n]/);
      const context = contextMatch ? contextMatch[1] : "No context available";
      
      // Extract subtopics - improved extraction
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
      
      // If still no subtopics found, try to extract any bullet points from the content
      if (subTopics.length === 0) {
        const bulletPointsRegex = /•\s+([^\n•]+)/g;
        const bulletMatches = [...trendContent.matchAll(bulletPointsRegex)];
        if (bulletMatches.length > 0) {
          subTopics = bulletMatches.map(match => match[1].trim());
        }
      }
      
      // Extract example tweets and their metadata
      const exampleTweets = [];
      
      // Match tweet pairs (text + metadata)
      const tweetPattern = /\*Example of Real Current Tweet\d+:\s+(.*?)(?=\*Tweet\d+_Metadata|\*Example|\*\*|<\/Trend|$)/gs;
      const metadataPattern = /\*Tweet\d+_Metadata:\s+(.*?)(?=\*Example|\*\*|<\/Trend|$)/gs;
      
      const tweetTexts = [...trendContent.matchAll(tweetPattern)].map(match => match[1].trim());
      const metadataTexts = [...trendContent.matchAll(metadataPattern)].map(match => match[1].trim());
      
      // Process each tweet-metadata pair
      for (let i = 0; i < Math.min(tweetTexts.length, metadataTexts.length); i++) {
        try {
          // Parse the metadata JSON
          let metadataJson;
          try {
            // Try to parse the JSON metadata
            metadataJson = JSON.parse(metadataTexts[i]);
          } catch (e) {
            // If JSON parsing fails, try to extract values with regex
            const mdText = metadataTexts[i];
            metadataJson = {
              authorName: (mdText.match(/"authorName":\s*"([^"]+)"/) || [])[1] || "Unknown Author",
              handle: (mdText.match(/"handle":\s*"([^"]+)"/) || [])[1] || "@unknown",
              verified: mdText.includes('"verified": true'),
              profilePicUrl: (mdText.match(/"profilePicUrl":\s*"([^"]+)"/) || [])[1] || "",
              timestamp: (mdText.match(/"timestamp":\s*"([^"]+)"/) || [])[1] || new Date().toISOString(),
              likes: parseInt((mdText.match(/"likes":\s*(\d+)/) || [])[1] || "0"),
              replies: parseInt((mdText.match(/"replies":\s*(\d+)/) || [])[1] || "0"),
              retweets: parseInt((mdText.match(/"retweets":\s*(\d+)/) || [])[1] || "0")
            };
          }
          
          // Use the actual metadata from OpenAI response for the profile
          const profile = {
            username: metadataJson.handle?.replace('@', '') || "unknown_user",
            displayName: metadataJson.authorName || "Unknown User",
            verified: metadataJson.verified || false,
            timestamp: metadataJson.timestamp || new Date().toISOString(),
            avatarUrl: metadataJson.profilePicUrl || ""
          };
          
          exampleTweets.push({
            text: tweetTexts[i],
            profile: profile,
            metrics: {
              likes: metadataJson.likes || 0,
              replies: metadataJson.replies || 0,
              retweets: metadataJson.retweets || 0
            }
          });
        } catch (error) {
          console.error("Error parsing tweet metadata:", error);
          // Fallback to generate fake profile if parsing fails
          const profile = {
            username: `user_${i}`,
            displayName: "Twitter User",
            verified: false,
            timestamp: new Date().toISOString(),
            avatarUrl: ""
          };
          
          exampleTweets.push({
            text: tweetTexts[i] || "No text available",
            profile: profile,
            metrics: {
              likes: 0,
              replies: 0,
              retweets: 0
            }
          });
        }
      }
      
      // If no tweets were found with the primary pattern, use the fallback generator
      if (exampleTweets.length === 0) {
        // Extract tweet texts in a more lenient way
        const altTweetTexts = [];
        const lines = trendContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("Example") && lines[i].includes("Tweet") && i + 1 < lines.length) {
            altTweetTexts.push(lines[i + 1].trim());
          }
        }
        
        // Generate fallback profiles for each tweet
        for (let i = 0; i < altTweetTexts.length; i++) {
          const text = altTweetTexts[i];
          if (text && text.length > 0) {
            // Generate a mock profile as fallback
            const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const gender = seed % 2 === 0 ? 'men' : 'women';
            const avatarId = (seed % 99) + 1; // Range 1-99
            
            const profile = {
              username: `user_${i}_${seed % 1000}`,
              displayName: `Twitter User ${i + 1}`,
              verified: seed % 10 === 0, // 10% chance of being verified
              timestamp: new Date(Date.now() - (seed % 48) * 3600000).toISOString(),
              avatarUrl: `https://randomuser.me/api/portraits/${gender}/${avatarId}.jpg`
            };
            
            exampleTweets.push({
              text: text,
              profile: profile,
              metrics: {
                likes: seed % 100,
                replies: seed % 50,
                retweets: seed % 30
              }
            });
          }
        }
      }
      
      trends.push({
        header,
        sentiment,
        context,
        subTopics,
        exampleTweets
      });
    }
    
    // If no matches found with the primary regex, try an alternative parsing approach
    if (!matchFound) {
      console.log("No trend matches found with primary regex, trying alternative parsing...");
      
      // Alternative parsing for different format - looking for sections without XML tags
      const sections = content.split(/\n\n+/);
      for (const section of sections) {
        if (section.trim().length > 0) {
          // Try to extract a title/header from the section
          const titleMatch = section.match(/^(.+?)(?:\n|$)/);
          const header = titleMatch ? titleMatch[1].trim() : "Unknown Topic";
          
          // Just use the whole section as context if we can't parse it properly
          trends.push({
            header,
            sentiment: "neutral",
            context: section.trim(),
            subTopics: [],
            exampleTweets: []
          });
        }
      }
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
    // Read category from the request body instead of URL params
    const { category } = await req.json();
    
    if (!category) {
      throw new Error("Category parameter is required");
    }
    
    console.log(`Fetching trending topics for category: ${category}`);
    const topics = await fetchTrendingTopicsFromRedis(category);
    console.log(`Found ${topics.length} topics for category ${category}`);
    
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
