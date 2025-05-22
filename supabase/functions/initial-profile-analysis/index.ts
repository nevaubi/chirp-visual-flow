import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

interface ApifyResponse {
  tweets: Tweet[];
  error?: string;
}

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  createdAt?: string; // New format from kaitoeasyapi actor
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  retweetCount?: number; // New format
  replyCount?: number;
  likeCount?: number;
  quoteCount?: number;
  viewCount?: number;
  entities?: {
    urls?: { expanded_url: string }[];
    media?: { type: string }[];
  };
  extendedEntities?: {
    media?: {
      expanded_url?: string;
      type?: string;
    }[];
  };
  author?: {
    userName?: string;
    name?: string;
    isBlueVerified?: boolean;
    location?: string;
    followers?: number;
    following?: number;
  };
}

interface ProfileAnalysisRequest {
  userId: string;
  twitterUsername: string;
  timezone: string;
}

interface ProfileAnalysisResult {
  circadian_rhythm: Record<string, number>;
  engagement_by_content_type: {
    text_only: number;
    with_image: number;
    with_video: number;
    with_link: number;
  };
  top_posting_hour: string;
  avg_engagement_rate: number;
  total_tweets_analyzed: number;
  best_performing_tweet: {
    text: string;
    engagement: number;
    date: string;
  };
  analysis_date: string;
  growth_opportunities: string[];
}

// Redis keys will be prefixed with this to avoid collisions
const REDIS_PREFIX = 'twitter_data:';

// Setup Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get Apify API key
const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY') as string

// Get Redis Upstash credentials
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') as string;
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') as string;

// Function to store individual tweet in Redis list
async function storeInRedisList(key: string, tweet: unknown): Promise<boolean> {
  try {
    if (!REDIS_URL || !REDIS_TOKEN) {
      console.error('Redis credentials not found');
      return false;
    }

    const fullKey = `${REDIS_PREFIX}${key}`;
    
    // Use RPUSH to add tweet to the list
    const url = `${REDIS_URL}/rpush/${fullKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        elements: [JSON.stringify(tweet)]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Redis storage error:', errorData);
      return false;
    }

    const result = await response.json();
    return result.result > 0; // RPUSH returns the new length of the list
  } catch (error) {
    console.error('Error storing tweet in Redis list:', error);
    return false;
  }
}

// Set expiration time for Redis key
async function setRedisExpiry(key: string, expireInDays = 30): Promise<boolean> {
  try {
    if (!REDIS_URL || !REDIS_TOKEN) {
      return false;
    }

    const fullKey = `${REDIS_PREFIX}${key}`;
    const url = `${REDIS_URL}/expire/${fullKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        seconds: expireInDays * 24 * 60 * 60 // Expire time in seconds
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Redis expiry error:', errorData);
      return false;
    }

    const result = await response.json();
    return result.result === 1;
  } catch (error) {
    console.error('Error setting Redis expiry:', error);
    return false;
  }
}

// Process and store tweet history in Redis
async function processTweetHistory(tweets: Tweet[], userId: string) {
  try {
    // Skip if no Redis credentials
    if (!REDIS_URL || !REDIS_TOKEN) {
      console.log('Skipping Redis storage: credentials not available');
      return false;
    }

    console.log(`Processing ${tweets.length} tweets for Redis storage`);
    
    // Redis key for this user's tweets
    const redisKey = `user:${userId}:tweets`;
    
    // First, clear any existing data for this key
    const deleteUrl = `${REDIS_URL}/del/${REDIS_PREFIX}${redisKey}`;
    await fetch(deleteUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    
    // Store each tweet individually in the Redis list
    let successCount = 0;
    for (const tweet of tweets) {
      // Format the tweet data
      const tweetData = {
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.createdAt || tweet.created_at || new Date().toISOString(),
        engagement: {
          likes: tweet.likeCount || tweet.public_metrics?.like_count || 0,
          retweets: tweet.retweetCount || tweet.public_metrics?.retweet_count || 0,
          replies: tweet.replyCount || tweet.public_metrics?.reply_count || 0,
          quotes: tweet.quoteCount || tweet.public_metrics?.quote_count || 0,
          views: tweet.viewCount || tweet.public_metrics?.impression_count || 0
        },
        // Determine content type
        has_image: !!(tweet.entities?.media?.some(m => m.type === 'photo') || 
                     tweet.extendedEntities?.media?.some(m => m.type === 'photo')),
        has_video: !!(tweet.entities?.media?.some(m => m.type === 'video') || 
                     tweet.extendedEntities?.media?.some(m => m.type === 'video')),
        has_link: !!(tweet.entities?.urls && tweet.entities.urls.length > 0)
      };
      
      // Add to Redis list
      const success = await storeInRedisList(redisKey, tweetData);
      if (success) successCount++;
      
      // Log success periodically to avoid excessive logging
      if (successCount % 10 === 0) {
        console.log(`Successfully stored ${successCount} tweets in Redis list: ${redisKey}`);
      }
    }
    
    // Set expiration for the Redis key
    await setRedisExpiry(redisKey, 90);
    
    console.log(`Completed processing ${tweets.length} tweets`);
    
    return successCount > 0;
  } catch (error) {
    console.error('Error processing tweet history for Redis:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const { userId, twitterUsername, timezone } = await req.json() as ProfileAnalysisRequest
    
    // Validate input
    if (!userId || !twitterUsername) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Starting analysis for user ${userId} with Twitter username @${twitterUsername}`)
    
    // Fetch user's tweets using Apify
    const tweets = await fetchTweets(twitterUsername)
    
    if (!tweets || tweets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tweets found or error fetching tweets' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Successfully fetched ${tweets.length} tweets for analysis`)
    
    // Analyze tweets and generate insights
    const analysisResults = analyzeUserTweets(tweets, timezone)
    
    // Update user profile with analysis results
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_analysis_results: analysisResults })
      .eq('id', userId)
    
    if (updateError) {
      console.error('Error updating profile with analysis results:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile with analysis results' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Process and store tweets in Redis in the background
    // This way we don't block the response and can handle any Redis errors separately
    try {
      // Use waitUntil to run Redis storage in the background
      const storagePromise = processTweetHistory(tweets, userId);
      EdgeRuntime.waitUntil(storagePromise);
      
      console.log('Redis storage task started in the background');
    } catch (redisError) {
      // If there's an error setting up the background task, just log it
      // We don't want to fail the whole function just because Redis has issues
      console.error('Error starting Redis background task:', redisError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Profile analysis completed successfully',
        results: analysisResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in profile analysis:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function fetchTweets(username: string): Promise<Tweet[]> {
  try {
    // Use the kaitoeasyapi actor for Twitter scraping - matching the one used in the working function
    const apifyUrl = `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`
    
    // Parameter structure matching the working code
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
      "from": username,
      "include:nativeretweets": false,
      "lang": "en",
      "maxItems": 100,
      "queryType": "Latest"
    }
    
    const response = await fetch(apifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    
    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`)
    }
    
    // The new actor returns an array directly, not wrapped in a 'tweets' property
    const data = await response.json() as Tweet[]
    
    console.log(`Received ${data.length} tweets from Apify`)
    
    if (!Array.isArray(data)) {
      console.error('Unexpected response format:', data)
      throw new Error('Unexpected response format from Apify')
    }
    
    return data
  } catch (error) {
    console.error('Error fetching tweets:', error)
    return []
  }
}

function analyzeUserTweets(tweets: Tweet[], timezone: string): ProfileAnalysisResult {
  // Initialize analysis data structure
  const hourlyActivity: Record<string, number> = {}
  const hourlyEngagement: Record<string, number> = {}
  
  let totalEngagement = 0
  let totalTweets = tweets.length
  let bestTweet: Tweet | null = null
  let bestTweetEngagement = 0
  
  // Content type engagement
  const contentTypeEngagement = {
    text_only: { count: 0, engagement: 0 },
    with_image: { count: 0, engagement: 0 },
    with_video: { count: 0, engagement: 0 },
    with_link: { count: 0, engagement: 0 }
  }
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0')
    hourlyActivity[hour] = 0
    hourlyEngagement[hour] = 0
  }
  
  // Process each tweet
  tweets.forEach(tweet => {
    // Skip retweets
    if ((tweet.text || '').startsWith('RT @')) {
      totalTweets--
      return
    }
    
    // Parse tweet date (handle both original and new format)
    const tweetDate = new Date(tweet.createdAt || tweet.created_at || '')
    
    // Adjust for timezone if provided
    if (timezone) {
      try {
        const options = { timeZone: timezone }
        const timeString = tweetDate.toLocaleTimeString('en-US', options)
        const hourMatch = timeString.match(/(\d+):/)
        let hour = hourMatch ? parseInt(hourMatch[1]) : 0
        
        // Convert from 12-hour to 24-hour format if needed
        if (timeString.includes('PM') && hour !== 12) {
          hour += 12
        } else if (timeString.includes('AM') && hour === 12) {
          hour = 0
        }
        
        const hourString = hour.toString().padStart(2, '0')
        hourlyActivity[hourString]++
      } catch (error) {
        console.warn('Error parsing timezone, using UTC:', error)
        const hour = tweetDate.getUTCHours().toString().padStart(2, '0')
        hourlyActivity[hour]++
      }
    } else {
      // Fallback to UTC
      const hour = tweetDate.getUTCHours().toString().padStart(2, '0')
      hourlyActivity[hour]++
    }
    
    // Calculate engagement (use both formats)
    const engagement = 
      (tweet.public_metrics?.like_count || tweet.likeCount || 0) + 
      (tweet.public_metrics?.retweet_count || tweet.retweetCount || 0) * 2 + 
      (tweet.public_metrics?.reply_count || tweet.replyCount || 0) * 3 + 
      (tweet.public_metrics?.quote_count || tweet.quoteCount || 0) * 3
    
    totalEngagement += engagement
    
    // Track best performing tweet
    if (engagement > bestTweetEngagement) {
      bestTweetEngagement = engagement
      bestTweet = tweet
    }
    
    // Determine content type
    let contentType = 'text_only'
    
    // Check for media in both old and new formats
    const hasVideo = 
      tweet.entities?.urls?.some(url => url.expanded_url.includes('video')) ||
      tweet.extendedEntities?.media?.some(media => media.type === 'video' || media.expanded_url?.includes('video'))
    
    const hasImage = 
      tweet.entities?.media?.some(media => media.type === 'photo') ||
      tweet.extendedEntities?.media?.some(media => media.type === 'photo' || media.expanded_url?.includes('photo'))
    
    const hasLink = tweet.entities?.urls && tweet.entities.urls.length > 0
    
    if (hasVideo) {
      contentType = 'with_video'
    } else if (hasImage) {
      contentType = 'with_image'
    } else if (hasLink) {
      contentType = 'with_link'
    }
    
    contentTypeEngagement[contentType].count++
    contentTypeEngagement[contentType].engagement += engagement
  })
  
  // Calculate average engagement rate
  const avgEngagementRate = totalTweets > 0 ? totalEngagement / totalTweets : 0
  
  // Find top posting hour
  let topHour = '00'
  let maxActivity = 0
  
  for (const [hour, count] of Object.entries(hourlyActivity)) {
    if (count > maxActivity) {
      maxActivity = count
      topHour = hour
    }
  }
  
  // Calculate engagement by content type
  const engagementByContentType = {
    text_only: contentTypeEngagement.text_only.count > 0 
      ? contentTypeEngagement.text_only.engagement / contentTypeEngagement.text_only.count 
      : 0,
    with_image: contentTypeEngagement.with_image.count > 0 
      ? contentTypeEngagement.with_image.engagement / contentTypeEngagement.with_image.count 
      : 0,
    with_video: contentTypeEngagement.with_video.count > 0 
      ? contentTypeEngagement.with_video.engagement / contentTypeEngagement.with_video.count 
      : 0,
    with_link: contentTypeEngagement.with_link.count > 0 
      ? contentTypeEngagement.with_link.engagement / contentTypeEngagement.with_link.count 
      : 0
  }
  
  // Generate growth opportunities
  const growthOpportunities = generateGrowthOpportunities(
    hourlyActivity, 
    engagementByContentType, 
    avgEngagementRate,
    topHour
  )
  
  // Format result
  return {
    circadian_rhythm: hourlyActivity,
    engagement_by_content_type: engagementByContentType,
    top_posting_hour: topHour,
    avg_engagement_rate: avgEngagementRate,
    total_tweets_analyzed: totalTweets,
    best_performing_tweet: bestTweet ? {
      text: bestTweet.text.length > 100 ? bestTweet.text.substring(0, 97) + '...' : bestTweet.text,
      engagement: bestTweetEngagement,
      date: bestTweet.createdAt || bestTweet.created_at || new Date().toISOString()
    } : { text: '', engagement: 0, date: '' },
    analysis_date: new Date().toISOString(),
    growth_opportunities: growthOpportunities
  }
}

function generateGrowthOpportunities(
  hourlyActivity: Record<string, number>,
  engagementByContentType: Record<string, number>,
  avgEngagementRate: number,
  topHour: string
): string[] {
  const opportunities = []
  
  // Check content type recommendations
  const bestContentType = Object.entries(engagementByContentType)
    .sort((a, b) => b[1] - a[1])[0][0]
  
  const contentTypeMap = {
    'text_only': 'text-only tweets',
    'with_image': 'tweets with images',
    'with_video': 'tweets with videos',
    'with_link': 'tweets with links'
  }
  
  opportunities.push(`Your ${contentTypeMap[bestContentType]} perform best. Consider posting more of this content type.`)
  
  // Convert hour to readable format
  const hourNum = parseInt(topHour)
  const formattedHour = hourNum === 0 ? '12 AM' 
    : hourNum < 12 ? `${hourNum} AM` 
    : hourNum === 12 ? '12 PM' 
    : `${hourNum - 12} PM`
  
  opportunities.push(`Your audience is most active around ${formattedHour}. Try posting consistently at this time.`)
  
  // Check engagement rate
  if (avgEngagementRate < 5) {
    opportunities.push('Your overall engagement rate could be improved. Try asking questions or creating polls to boost interaction.')
  }
  
  return opportunities
}
