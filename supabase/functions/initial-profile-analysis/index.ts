
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

interface ApifyResponse {
  tweets: Tweet[];
  error?: string;
}

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  entities?: {
    urls?: { expanded_url: string }[];
    media?: { type: string }[];
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

// Setup Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get Apify API key
const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY') as string

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
    // Use Apify API to get user tweets
    const apifyUrl = `https://api.apify.com/v2/acts/quacker~twitter-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`
    const response = await fetch(apifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchTerms: [`from:${username}`],
        maxTweets: 100,
        useTimelineApi: true
      })
    })
    
    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`)
    }
    
    const data = await response.json() as ApifyResponse
    
    if (data.error) {
      throw new Error(`Apify returned error: ${data.error}`)
    }
    
    return data.tweets || []
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
    if (tweet.text.startsWith('RT @')) {
      totalTweets--
      return
    }
    
    // Parse tweet date
    const tweetDate = new Date(tweet.created_at)
    
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
    
    // Calculate engagement
    const engagement = 
      tweet.public_metrics.like_count + 
      tweet.public_metrics.retweet_count * 2 + 
      tweet.public_metrics.reply_count * 3 + 
      tweet.public_metrics.quote_count * 3
    
    totalEngagement += engagement
    
    // Track best performing tweet
    if (engagement > bestTweetEngagement) {
      bestTweetEngagement = engagement
      bestTweet = tweet
    }
    
    // Determine content type
    let contentType = 'text_only'
    if (tweet.entities?.urls?.some(url => url.expanded_url.includes('video'))) {
      contentType = 'with_video'
    } else if (tweet.entities?.media?.some(media => media.type === 'photo')) {
      contentType = 'with_image'
    } else if (tweet.entities?.urls && tweet.entities.urls.length > 0) {
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
      date: bestTweet.created_at
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
