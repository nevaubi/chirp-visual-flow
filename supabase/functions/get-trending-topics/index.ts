
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    let decodedContent;
    try {
      decodedContent = decodeURIComponent(data.result);
    } catch (decodeError) {
      decodedContent = data.result;
    }
    
    return parseTrendsFromContent(decodedContent);
  } catch (error) {
    throw error;
  }
}

function parseTrendsFromContent(content: string): any[] {
  try {
    const trends = [];
    
    if (!content || typeof content !== 'string') {
      return [];
    }
    
    const trendRegex = /<Trend\d+>([\s\S]*?)<\/Trend\d+>/g;
    const trendMatches = content.matchAll(trendRegex);
    
    let matchFound = false;
    
    for (const match of trendMatches) {
      matchFound = true;
      const trendContent = match[1];
      
      let header = "Unknown Topic";
      
      const headerMatch = trendContent.match(/\[(.*?)\]/);
      if (headerMatch && headerMatch[1] && headerMatch[1].trim().length > 0) {
        header = headerMatch[1].trim();
      } else {
        const lines = trendContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length > 0) {
          const firstLine = lines[0].replace(/\*/g, '').replace(/\[|\]/g, '').replace(/^#+\s+/, '').trim();
          if (firstLine.length > 0) {
            header = firstLine;
          }
        }
      }
      
      const sentimentMatch = trendContent.match(/\*\s+\*\*Sentiment:\*\*\s+(.*?)[\r\n]/);
      const sentiment = sentimentMatch ? sentimentMatch[1] : "neutral";
      
      const contextMatch = trendContent.match(/\*\s+\*\*Context:\*\*\s+(.*?)[\r\n]/);
      const context = contextMatch ? contextMatch[1] : "No context available";
      
      const subTopicsMatch = trendContent.match(/\*\s+\*\*Sub topics:\*\*\s+(.*?)[\r\n]/);
      let subTopics = [];
      
      if (subTopicsMatch && subTopicsMatch[1]) {
        const subTopicsText = subTopicsMatch[1];
        const bulletMatch = subTopicsText.match(/\[([^\]]+)\]/g);
        if (bulletMatch) {
          subTopics = bulletMatch.map(bullet => bullet.replace(/[\[\]]/g, '').trim());
        } else {
          subTopics = subTopicsText.split(/,|\n/).map(topic => topic.trim()).filter(Boolean);
        }
      }
      
      if (subTopics.length === 0) {
        const bulletPointsRegex = /•\s+([^\n•]+)/g;
        const bulletMatches = [...trendContent.matchAll(bulletPointsRegex)];
        if (bulletMatches.length > 0) {
          subTopics = bulletMatches.map(match => match[1].trim());
        }
      }
      
      const exampleTweets = [];
      
      const tweetPattern = /\*Example of Real Current Tweet\d+:\s+(.*?)(?=\*Tweet\d+_Metadata|\*Example|\*\*|<\/Trend|$)/gs;
      const metadataPattern = /\*Tweet\d+_Metadata:\s+(.*?)(?=\*Example|\*\*|<\/Trend|$)/gs;
      
      const tweetTexts = [...trendContent.matchAll(tweetPattern)].map(match => match[1].trim());
      const metadataTexts = [...trendContent.matchAll(metadataPattern)].map(match => match[1].trim());
      
      for (let i = 0; i < Math.min(tweetTexts.length, metadataTexts.length); i++) {
        try {
          let metadataJson;
          try {
            metadataJson = JSON.parse(metadataTexts[i]);
          } catch (e) {
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
      
      if (exampleTweets.length === 0) {
        const altTweetTexts = [];
        const lines = trendContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("Example") && lines[i].includes("Tweet") && i + 1 < lines.length) {
            altTweetTexts.push(lines[i + 1].trim());
          }
        }
        
        for (let i = 0; i < altTweetTexts.length; i++) {
          const text = altTweetTexts[i];
          if (text && text.length > 0) {
            const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const gender = seed % 2 === 0 ? 'men' : 'women';
            const avatarId = (seed % 99) + 1;
            
            const profile = {
              username: `user_${i}_${seed % 1000}`,
              displayName: `Twitter User ${i + 1}`,
              verified: seed % 10 === 0,
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
    
    if (!matchFound) {
      const sections = content.split(/\n\n+/);
      for (const section of sections) {
        if (section.trim().length > 0) {
          const titleMatch = section.match(/^(.+?)(?:\n|$)/);
          const header = titleMatch ? titleMatch[1].trim() : "Unknown Topic";
          
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
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category } = await req.json();
    
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
