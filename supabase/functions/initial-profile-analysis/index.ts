
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

// Redis keys will be prefixed with this to avoid collisions
const REDIS_PREFIX = 'twitter_data:';

// Setup Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get Apify API key
const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');

// Get Redis Upstash credentials
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

// Rate limiting state
const ipRequests: Record<string, { count: number, timestamp: number }> = {};
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute window

// Fixed tweet limit
const MAX_TWEETS = 100;

// Function to check rate limit
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const userRequests = ipRequests[ip];
  
  if (!userRequests || now - userRequests.timestamp > RATE_WINDOW) {
    ipRequests[ip] = { count: 1, timestamp: now };
    return false;
  }
  
  if (userRequests.count >= RATE_LIMIT) {
    return true;
  }
  
  userRequests.count++;
  return false;
}

// Function to get user's subscription tier
async function getUserSubscriptionTier(userId: string): Promise<string> {
  if (!supabaseUrl || !supabaseServiceKey || !userId) {
    return "Free Lite"; // Default tier
  }
  
  try {
    const { data: subscriptionData, error } = await supabase
      .from("stripe_subscriptions")
      .select("stripe_price_id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    
    if (error || !subscriptionData) {
      console.log("No active subscription found, defaulting to Free Lite tier");
      return "Free Lite";
    }
    
    // Map price IDs to tiers
    if (subscriptionData.stripe_price_id === "price_1RMldE4ZlEAhR5Dv4Le2c8sT") {
      return "Starter";
    } else if (subscriptionData.stripe_price_id === "price_1RMlhC4ZlEAhR5Dv26fBZsFM") {
      return "Growth";
    }
    
    return "Free Lite"; // Default if price ID doesn't match known tiers
  } catch (error) {
    console.error(`Error getting subscription tier: ${error.message || error.toString()}`);
    return "Free Lite"; // Default on error
  }
}

// Function to store individual tweet in Redis list
async function storeInRedisList(key, tweet) {
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
        elements: [
          JSON.stringify(tweet)
        ]
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
async function setRedisExpiry(key, expireInDays = 30) {
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

// Process and store tweet history in Redis
async function processTweetHistory(tweets, userId, twitterUsername) {
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
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`
      }
    });
    
    // Store each tweet individually in the Redis list
    let successCount = 0;
    for (const tweet of tweets) {
      const mediaType = determineMediaType(tweet);
      
      // Format the tweet record with VERSION2's detailed structure
      const tweetRecord = {
        "Twitter author name": tweet.author?.name || null,
        "Handle": tweet.author?.userName || twitterUsername,
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
        "location": tweet.author?.location || null,
        "followers": tweet.author?.followers || 0,
        "following": tweet.author?.following || 0,
        "Inception": tweet.extendedEntities?.media?.[0]?.additional_media_info?.source_user?.user_results?.result?.core?.created_at || null,
        "Timestamp": tweet.createdAt || null
      };
      
      // Add to Redis list using VERSION1's method
      const success = await storeInRedisList(redisKey, tweetRecord);
      if (success) successCount++;
      
      // Log success periodically to avoid excessive logging
      if (successCount % 10 === 0) {
        console.log(`Successfully stored ${successCount} tweets in Redis list: ${redisKey}`);
      }
      
      // Add a small delay to avoid overwhelming Redis
      await new Promise(resolve => setTimeout(resolve, 20));
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
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  // Get client IP for rate limiting
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { userId, twitterUsername, timezone } = await req.json();
    
    // Validate input
    if (!userId || !twitterUsername) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    
    console.log(`Starting analysis for user ${userId} with Twitter username @${twitterUsername}`);
    
    // Get the user's subscription tier (still useful for analytics)
    const subscriptionTier = await getUserSubscriptionTier(userId);
    console.log(`User ${userId} has subscription tier: ${subscriptionTier}`);
    
    // Use fixed tweet limit regardless of subscription tier
    console.log(`Using fixed tweet limit: ${MAX_TWEETS}`);
    
    // Fetch user's tweets using Apify
    const tweets = await fetchTweets(twitterUsername, MAX_TWEETS);
    if (!tweets || tweets.length === 0) {
      return new Response(JSON.stringify({
        error: 'No tweets found or error fetching tweets'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    
    console.log(`Successfully fetched ${tweets.length} tweets for analysis`);
    
    // Analyze tweets and generate insights using VERSION2's sophisticated analysis
    const analysisResults = analyzeUserTweets(tweets, timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Update user profile with analysis results
    const { error: updateError } = await supabase.from('profiles').update({
      profile_analysis_results: analysisResults
    }).eq('id', userId);
    
    if (updateError) {
      console.error('Error updating profile with analysis results:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to update profile with analysis results'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    
    // Process and store tweets in Redis in the background
    // This way we don't block the response and can handle any Redis errors separately
    try {
      // Use waitUntil to run Redis storage in the background
      const storagePromise = processTweetHistory(tweets, userId, twitterUsername);
      EdgeRuntime.waitUntil(storagePromise);
      console.log('Redis storage task started in the background');
    } catch (redisError) {
      // If there's an error setting up the background task, just log it
      // We don't want to fail the whole function just because Redis has issues
      console.error('Error starting Redis background task:', redisError);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Profile analysis completed successfully',
      results: analysisResults
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in profile analysis:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

async function fetchTweets(username, maxTweets = 100) {
  try {
    // Use the kaitoeasyapi actor for Twitter scraping - matching the one used in the working function
    const apifyUrl = `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`;
    
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
      "maxItems": maxTweets,
      "queryType": "Latest"
    };
    
    const response = await fetch(apifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`);
    }
    
    // The new actor returns an array directly, not wrapped in a 'tweets' property
    const data = await response.json();
    console.log(`Received ${data.length} tweets from Apify`);
    
    if (!Array.isArray(data)) {
      console.error('Unexpected response format:', data);
      throw new Error('Unexpected response format from Apify');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching tweets:', error);
    return [];
  }
}

function analyzeUserTweets(tweets, timezone) {
  // Initialize analysis data structure with VERSION2's sophisticated metrics
  let totalEpiSum = 0, totalEpiCount = 0;
  let photoEpiSum = 0, photoEpiCount = 0;
  let videoEpiSum = 0, videoEpiCount = 0;
  let totalAmpSum = 0;
  let photoAmpSum = 0;
  let videoAmpSum = 0;
  let convRateSum = 0;
  let totalReplies = 0;

  // reply vs post counters
  let replyTweetsCount = 0;
  let nonReplyTweetsCount = 0;

  const dates: number[] = [];
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  const likesByHour: Record<number, { sum: number; count: number }> = {};
  
  // Hourly activity tracking for original format compatibility
  const hourlyActivity = {};
  let totalTweets = tweets.length;
  let bestTweet = null;
  let bestTweetEngagement = 0;

  // length-based metrics initialization
  const lengthRanges = ["<50", "50-100", "100-150", "150+"];
  const countsByLength: Record<string, number> = {"<50":0,"50-100":0,"100-150":0,"150+":0};
  const likesByLength: Record<string, number> = {"<50":0,"50-100":0,"100-150":0,"150+":0};
  const repliesByLength: Record<string, number> = {"<50":0,"50-100":0,"100-150":0,"150+":0};
  const retweetsByLength: Record<string, number> = {"<50":0,"50-100":0,"100-150":0,"150+":0};

  // Content type engagement for original format
  const contentTypeEngagement = {
    text_only: { count: 0, engagement: 0 },
    with_image: { count: 0, engagement: 0 },
    with_video: { count: 0, engagement: 0 },
    with_link: { count: 0, engagement: 0 }
  };

  // Initialize all hours for original format
  for(let i = 0; i < 24; i++){
    const hour = i.toString().padStart(2, '0');
    hourlyActivity[hour] = 0;
  }

  for (const t of tweets) {
    // Skip retweets for total count
    if ((t.text || '').startsWith('RT @')) {
      totalTweets--;
      continue;
    }

    // reply vs non-reply
    if (t.isReply) replyTweetsCount++; else nonReplyTweetsCount++;

    const text = t.text || "";
    const len = text.length;
    let range = "150+";
    if (len < 50) range = "<50";
    else if (len <= 100) range = "50-100";
    else if (len <= 150) range = "100-150";
    countsByLength[range]++;

    const rc = t.retweetCount || 0;
    const q = t.quoteCount || 0;
    const l = t.likeCount || 0;
    const r = t.replyCount || 0;
    const v = t.viewCount || 1;

    // length-based sums
    likesByLength[range] += l;
    repliesByLength[range] += r;
    retweetsByLength[range] += rc;

    // engagement & amplification
    const epi = (l + r + rc + q) / v;
    const amp = l > 0 ? rc / l : 0;
    totalEpiSum += epi; totalEpiCount++;
    totalAmpSum += amp;
    convRateSum += r / v;
    totalReplies += r;

    // Track best performing tweet for original format
    const engagement = l + rc * 2 + r * 3 + q * 3;
    if (engagement > bestTweetEngagement) {
      bestTweetEngagement = engagement;
      bestTweet = t;
    }

    // media analysis
    const media = t.extendedEntities?.media || [];
    const hasVideo = media.some(m => m.expanded_url?.includes("/video/"));
    const hasPhoto = media.some(m => m.expanded_url?.includes("/photo/"));
    const hasLink = t.entities?.urls && t.entities.urls.length > 0;
    
    if (hasVideo) { 
      videoEpiSum += epi; videoEpiCount++; videoAmpSum += amp;
      contentTypeEngagement.with_video.count++;
      contentTypeEngagement.with_video.engagement += engagement;
    } else if (hasPhoto) { 
      photoEpiSum += epi; photoEpiCount++; photoAmpSum += amp;
      contentTypeEngagement.with_image.count++;
      contentTypeEngagement.with_image.engagement += engagement;
    } else if (hasLink) {
      contentTypeEngagement.with_link.count++;
      contentTypeEngagement.with_link.engagement += engagement;
    } else {
      contentTypeEngagement.text_only.count++;
      contentTypeEngagement.text_only.engagement += engagement;
    }

    // timestamps and hourly analysis
    const ts = new Date(t.createdAt).getTime();
    dates.push(ts);

    // Parse tweet date for timezone adjustment
    const tweetDate = new Date(t.createdAt || '');
    let hour = 0;
    
    if (timezone) {
      try {
        const d = new Date(tweetDate.toLocaleString("en-US", { timeZone: timezone }));
        hour = d.getHours();
        const day = d.getDay();
        heatmap[day][hour]++;
      } catch (error) {
        console.warn('Error parsing timezone, using UTC:', error);
        hour = tweetDate.getUTCHours();
        const day = tweetDate.getUTCDay();
        heatmap[day][hour]++;
      }
    } else {
      hour = tweetDate.getUTCHours();
      const day = tweetDate.getUTCDay();
      heatmap[day][hour]++;
    }
    
    const hourString = hour.toString().padStart(2, '0');
    hourlyActivity[hourString]++;
    
    if (!likesByHour[hour]) likesByHour[hour] = { sum:0, count:0 };
    likesByHour[hour].sum += l;
    likesByHour[hour].count++;
  }

  // Calculate metrics
  dates.sort((a,b)=>a-b);
  const daysSpan = dates.length ? Math.ceil((dates[dates.length-1]-dates[0])/(1000*60*60*24)) : 0;
  const tweetHistory = `${daysSpan} Days History of Tweets (${tweets.length} total tweets)`;

  // hourly metrics
  const hourlyAvgLikes: Record<number, number> = {};
  const averageTweetsPerHour: Record<number, number> = {};
  for (let h=0; h<24; h++) {
    const data = likesByHour[h] || { sum:0, count:0 };
    hourlyAvgLikes[h] = data.count ? data.sum/data.count : 0;
    averageTweetsPerHour[h] = daysSpan ? data.count/daysSpan : data.count;
  }

  // length-based averages
  const avgLikesByLength: Record<string, number> = {};
  const avgRepliesByLength: Record<string, number> = {};
  const avgRetweetsByLength: Record<string, number> = {};
  for (const range of lengthRanges) {
    const cnt = countsByLength[range];
    avgLikesByLength[range] = cnt ? likesByLength[range]/cnt : 0;
    avgRepliesByLength[range] = cnt ? repliesByLength[range]/cnt : 0;
    avgRetweetsByLength[range] = cnt ? retweetsByLength[range]/cnt : 0;
  }

  // Core metrics from VERSION2
  const EPI = {
    overall: totalEpiCount ? totalEpiSum/totalEpiCount : 0,
    photo: photoEpiCount ? photoEpiSum/photoEpiCount : 0,
    video: videoEpiCount ? videoEpiSum/videoEpiCount : 0
  };
  
  const amplificationRatio = {
    overall: totalEpiCount ? totalAmpSum/totalEpiCount : 0,
    photo: photoEpiCount ? photoAmpSum/photoEpiCount : 0,
    video: videoEpiCount ? videoAmpSum/videoEpiCount : 0
  };
  
  const conversationRate = totalEpiCount ? convRateSum/totalEpiCount : 0;
  const replyPercentage = tweets.length ? totalReplies/tweets.length : 0;

  // reply vs post stats
  const replyTweetsPercentage = tweets.length ? replyTweetsCount/tweets.length : 0;
  const nonReplyTweetsPercentage = tweets.length ? nonReplyTweetsCount/tweets.length : 0;

  // Calculate average engagement rate for original format
  const avgEngagementRate = totalTweets > 0 ? (totalEpiSum * totalTweets) / totalTweets : 0;

  // Find top posting hour for original format
  let topHour = '00';
  let maxActivity = 0;
  for (const [hour, count] of Object.entries(hourlyActivity)){
    if (count > maxActivity) {
      maxActivity = count;
      topHour = hour;
    }
  }

  // Calculate engagement by content type for original format
  const engagementByContentType = {
    text_only: contentTypeEngagement.text_only.count > 0 ? contentTypeEngagement.text_only.engagement / contentTypeEngagement.text_only.count : 0,
    with_image: contentTypeEngagement.with_image.count > 0 ? contentTypeEngagement.with_image.engagement / contentTypeEngagement.with_image.count : 0,
    with_video: contentTypeEngagement.with_video.count > 0 ? contentTypeEngagement.with_video.engagement / contentTypeEngagement.with_video.count : 0,
    with_link: contentTypeEngagement.with_link.count > 0 ? contentTypeEngagement.with_link.engagement / contentTypeEngagement.with_link.count : 0
  };

  // best hour
  let bestHour=0, bestAvg=0;
  for (const [hStr, avg] of Object.entries(hourlyAvgLikes)) {
    const h = Number(hStr);
    if (avg>bestAvg) { bestAvg=avg; bestHour=h; }
  }

  // Generate growth opportunities for original format
  const growthOpportunities = generateGrowthOpportunities(hourlyActivity, engagementByContentType, avgEngagementRate, topHour);

  // Return enhanced results combining both VERSION1 and VERSION2 formats
  return {
    // VERSION1 original format
    circadian_rhythm: hourlyActivity,
    engagement_by_content_type: engagementByContentType,
    top_posting_hour: topHour,
    avg_engagement_rate: avgEngagementRate,
    total_tweets_analyzed: totalTweets,
    best_performing_tweet: bestTweet ? {
      text: bestTweet.text.length > 100 ? bestTweet.text.substring(0, 97) + '...' : bestTweet.text,
      engagement: bestTweetEngagement,
      date: bestTweet.createdAt || new Date().toISOString()
    } : {
      text: '',
      engagement: 0,
      date: ''
    },
    analysis_date: new Date().toISOString(),
    growth_opportunities: growthOpportunities,
    
    // VERSION2 enhanced metrics
    timezone,
    tweetHistory,
    hourlyAvgLikes,
    averageTweetsPerHour,
    avgLikesByLength,
    avgRepliesByLength,
    avgRetweetsByLength,
    EPI,
    amplificationRatio,
    conversationRate,
    replyPercentage,
    replyVsPostStats: {
      replyCount: replyTweetsCount,
      replyPercentage: replyTweetsPercentage,
      postCount: nonReplyTweetsCount,
      postPercentage: nonReplyTweetsPercentage
    },
    circadianHeatmap: heatmap,
    bestHourByAvgLikes: { hour: bestHour, avgLikes: bestAvg }
  };
}

function generateGrowthOpportunities(hourlyActivity, engagementByContentType, avgEngagementRate, topHour) {
  const opportunities = [];
  
  // Check content type recommendations
  const bestContentType = Object.entries(engagementByContentType).sort((a, b)=>b[1] - a[1])[0][0];
  const contentTypeMap = {
    'text_only': 'text-only tweets',
    'with_image': 'tweets with images',
    'with_video': 'tweets with videos',
    'with_link': 'tweets with links'
  };
  
  opportunities.push(`Your ${contentTypeMap[bestContentType]} perform best. Consider posting more of this content type.`);
  
  // Convert hour to readable format
  const hourNum = parseInt(topHour);
  const formattedHour = hourNum === 0 ? '12 AM' : hourNum < 12 ? `${hourNum} AM` : hourNum === 12 ? '12 PM' : `${hourNum - 12} PM`;
  opportunities.push(`Your audience is most active around ${formattedHour}. Try posting consistently at this time.`);
  
  // Check engagement rate
  if (avgEngagementRate < 5) {
    opportunities.push('Your overall engagement rate could be improved. Try asking questions or creating polls to boost interaction.');
  }
  
  return opportunities;
}
