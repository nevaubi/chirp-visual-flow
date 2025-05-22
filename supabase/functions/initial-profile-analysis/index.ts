import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  createdAt?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  retweetCount?: number;
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
      additional_media_info?: {
        source_user?: {
          user_results?: {
            result?: {
              core?: { created_at?: string }
            }
          }
        }
      }
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
  url?: string;
  isReply?: boolean;
  inReplyToUsername?: string;
  bookmarkCount?: number;
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

const REDIS_PREFIX = 'twitter_data:';

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY') as string;
const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') as string;
const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') as string;

/**
 * Pushes a single tweet-record into a Redis list under key `${REDIS_PREFIX}${key}`.
 */
async function storeTweetInRedis(key: string, data: unknown): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('Redis credentials not found');
    return;
  }
  const fullKey = `${REDIS_PREFIX}${key}`;
  try {
    const url = `${REDIS_URL}/lpush/${encodeURIComponent(fullKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ elements: [JSON.stringify(data)] })
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('Redis LPUSH error:', txt);
    }
  } catch (e) {
    console.error('Error pushing to Redis:', e);
  }
}

/**
 * Iterates the fetched tweets and pushes each normalized record into Redis.
 */
async function processTweetHistory(tweets: Tweet[], userId: string) {
  console.log(`Background: storing ${tweets.length} tweets for ${userId}`);
  const key = `user:${userId}:tweets`;

  for (const tweet of tweets) {
    const mediaList = tweet.extendedEntities?.media || tweet.entities?.media || [];
    const mediaType = mediaList.some(m => m.type === 'video' || m.expanded_url?.includes('/video/'))
      ? 'Video'
      : mediaList.some(m => m.type === 'photo' || m.expanded_url?.includes('/photo/'))
      ? 'Photo'
      : 'Text only';

    const record = {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.createdAt || tweet.created_at || new Date().toISOString(),
      engagement: {
        likes: tweet.likeCount ?? tweet.public_metrics?.like_count ?? 0,
        retweets: tweet.retweetCount ?? tweet.public_metrics?.retweet_count ?? 0,
        replies: tweet.replyCount ?? tweet.public_metrics?.reply_count ?? 0,
        quotes: tweet.quoteCount ?? tweet.public_metrics?.quote_count ?? 0,
        views: tweet.viewCount ?? tweet.public_metrics?.impression_count ?? 0
      },
      has_image: mediaType === 'Photo',
      has_video: mediaType === 'Video',
      has_link: !!(tweet.entities?.urls && tweet.entities.urls.length > 0),
      author: {
        name: tweet.author?.name ?? null,
        handle: tweet.author?.userName ?? null,
        verified: tweet.author?.isBlueVerified ?? false,
        location: tweet.author?.location ?? null,
        followers: tweet.author?.followers ?? 0,
        following: tweet.author?.following ?? 0
      },
      tweet_url: tweet.url ?? null,
      is_reply: tweet.isReply ?? false,
      reply_to: tweet.isReply ? tweet.inReplyToUsername : null,
      media_type: mediaType,
      bookmark_count: tweet.bookmarkCount ?? 0
    };

    await storeTweetInRedis(key, record);
    // small delay to throttle
    await new Promise(r => setTimeout(r, 20));
  }

  console.log(`Completed background Redis storage for ${userId}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, twitterUsername, timezone } =
      (await req.json()) as ProfileAnalysisRequest;

    if (!userId || !twitterUsername) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or twitterUsername' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting profile analysis for ${twitterUsername} (user ${userId})`);

    // 1) Fetch tweets from Apify
    const tweets = await fetchTweets(twitterUsername);
    if (!tweets.length) {
      return new Response(
        JSON.stringify({ error: 'No tweets fetched' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Fetched ${tweets.length} tweets`);

    // 2) Analyze tweets for profile insights
    const analysisResults = analyzeUserTweets(tweets, timezone);

    // 3) Update Supabase profile
    const { error: supError } = await supabase
      .from('profiles')
      .update({ profile_analysis_results: analysisResults })
      .eq('id', userId);
    if (supError) {
      console.error('Supabase update error:', supError);
      throw supError;
    }
    console.log('Supabase profile updated');

    // 4) Background Redis list-based storage
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(processTweetHistory(tweets, userId));
    } else {
      processTweetHistory(tweets, userId);
    }

    // 5) Respond with analysis
    return new Response(
      JSON.stringify({ success: true, results: analysisResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Error in profile-analysis function:', err);
    return new Response(
      JSON.stringify({ error: err.message || err.toString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Calls the Apify actor to fetch up to 100 latest tweets for the given username.
 */
async function fetchTweets(username: string): Promise<Tweet[]> {
  const endpoint =
    `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_API_KEY)}`;

  const params = {
    "from": username,
    "lang": "en",
    "maxItems": 100,
    "queryType": "Latest"
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    throw new Error(`Apify error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as Tweet[];
  return Array.isArray(data) ? data : [];
}

/**
 * Aggregates tweet data into a ProfileAnalysisResult.
 */
function analyzeUserTweets(tweets: Tweet[], timezone: string): ProfileAnalysisResult {
  const hourlyActivity: Record<string, number> = {};
  const contentTypeEngagement = {
    text_only: { count: 0, engagement: 0 },
    with_image: { count: 0, engagement: 0 },
    with_video: { count: 0, engagement: 0 },
    with_link: { count: 0, engagement: 0 }
  };
  let totalEngagement = 0;
  let totalTweets = tweets.length;
  let bestTweet: Tweet | null = null;
  let bestEngagement = 0;

  // Initialize hours
  for (let h = 0; h < 24; h++) {
    const hh = h.toString().padStart(2, '0');
    hourlyActivity[hh] = 0;
  }

  for (const tweet of tweets) {
    // skip retweets
    if (tweet.text.startsWith('RT @')) {
      totalTweets--;
      continue;
    }

    // parse creation date
    const raw = tweet.createdAt || tweet.created_at || '';
    const dt = new Date(raw);
    let hour = dt.getUTCHours();
    // adjust for timezone
    try {
      const local = new Date(dt.toLocaleString('en-US', { timeZone: timezone }));
      hour = local.getHours();
    } catch {
      // keep UTC hour
    }
    const hourStr = hour.toString().padStart(2, '0');
    hourlyActivity[hourStr]++;

    // compute engagement score
    const likes = tweet.likeCount ?? tweet.public_metrics?.like_count ?? 0;
    const retweets = tweet.retweetCount ?? tweet.public_metrics?.retweet_count ?? 0;
    const replies = tweet.replyCount ?? tweet.public_metrics?.reply_count ?? 0;
    const quotes = tweet.quoteCount ?? tweet.public_metrics?.quote_count ?? 0;
    const eng = likes + retweets*2 + replies*3 + quotes*3;
    totalEngagement += eng;
    if (eng > bestEngagement) {
      bestEngagement = eng;
      bestTweet = tweet;
    }

    // classify content type
    const hasImage = !!tweet.entities?.media?.some(m => m.type === 'photo')
      || !!tweet.extendedEntities?.media?.some(m => m.type === 'photo');
    const hasVideo = !!tweet.entities?.media?.some(m => m.type === 'video')
      || !!tweet.extendedEntities?.media?.some(m => m.type === 'video');
    const hasLink = !!tweet.entities?.urls?.length;

    let typeKey: keyof typeof contentTypeEngagement = 'text_only';
    if (hasVideo) typeKey = 'with_video';
    else if (hasImage) typeKey = 'with_image';
    else if (hasLink) typeKey = 'with_link';

    contentTypeEngagement[typeKey].count++;
    contentTypeEngagement[typeKey].engagement += eng;
  }

  const avgEngagementRate = totalTweets > 0 ? totalEngagement / totalTweets : 0;

  // find top posting hour
  let topHour = '00';
  let maxCount = 0;
  for (const [hr, cnt] of Object.entries(hourlyActivity)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      topHour = hr;
    }
  }

  const engagementByContentType = {
    text_only: contentTypeEngagement.text_only.count
      ? contentTypeEngagement.text_only.engagement / contentTypeEngagement.text_only.count
      : 0,
    with_image: contentTypeEngagement.with_image.count
      ? contentTypeEngagement.with_image.engagement / contentTypeEngagement.with_image.count
      : 0,
    with_video: contentTypeEngagement.with_video.count
      ? contentTypeEngagement.with_video.engagement / contentTypeEngagement.with_video.count
      : 0,
    with_link: contentTypeEngagement.with_link.count
      ? contentTypeEngagement.with_link.engagement / contentTypeEngagement.with_link.count
      : 0
  };

  const growthOpportunities = generateGrowthOpportunities(
    hourlyActivity,
    engagementByContentType,
    avgEngagementRate,
    topHour
  );

  return {
    circadian_rhythm: hourlyActivity,
    engagement_by_content_type: engagementByContentType,
    top_posting_hour: topHour,
    avg_engagement_rate: avgEngagementRate,
    total_tweets_analyzed: totalTweets,
    best_performing_tweet: bestTweet
      ? {
          text: bestTweet.text.length > 100
            ? bestTweet.text.slice(0, 97) + '...'
            : bestTweet.text,
          engagement: bestEngagement,
          date: bestTweet.createdAt || bestTweet.created_at || new Date().toISOString()
        }
      : { text: '', engagement: 0, date: new Date().toISOString() },
    analysis_date: new Date().toISOString(),
    growth_opportunities: growthOpportunities
  };
}

function generateGrowthOpportunities(
  hourlyActivity: Record<string, number>,
  engagementByContentType: Record<string, number>,
  avgEngagementRate: number,
  topHour: string
): string[] {
  const opportunities: string[] = [];

  // content type suggestion
  const bestType = Object.entries(engagementByContentType)
    .sort((a, b) => b[1] - a[1])[0][0];
  const typeMap: Record<string, string> = {
    text_only: 'text-only tweets',
    with_image: 'tweets with images',
    with_video: 'tweets with videos',
    with_link: 'tweets with links'
  };
  opportunities.push(
    `Your ${typeMap[bestType]} get the most engagement—consider posting more of them.`
  );

  // best posting hour suggestion
  const hr = Number(topHour);
  const formattedHour =
    hr === 0 ? '12 AM' :
    hr < 12 ? `${hr} AM` :
    hr === 12 ? '12 PM' :
    `${hr - 12} PM`;
  opportunities.push(
    `Your audience is most active around ${formattedHour}. Try posting consistently at that time.`
  );

  // engagement rate advice
  if (avgEngagementRate < 5) {
    opportunities.push(
      'Your average engagement rate is low. Try asking questions or running polls to boost interaction.'
    );
  }

  return opportunities;
}
