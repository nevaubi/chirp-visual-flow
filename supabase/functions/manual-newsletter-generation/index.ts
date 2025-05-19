
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Set up CORS headers for the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Twitter PKCE client configuration
const twitterClientId = Deno.env.get('TWITTER_BOOKMARK_CLIENT_ID')!;
const twitterClientSecret = Deno.env.get('TWITTER_BOOKMARK_CLIENT_SECRET')!;

interface RequestBody {
  tweetCount: number;
  userId: string;
}

const refreshTwitterToken = async (userId: string) => {
  // Fetch user profile to get refresh token
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('twitter_bookmark_refresh_token, twitter_bookmark_access_token, twitter_bookmark_token_expires_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching user profile:', profileError);
    throw new Error('Failed to get Twitter refresh token');
  }

  // Check if token is still valid
  const now = Math.floor(Date.now() / 1000);
  if (profile.twitter_bookmark_token_expires_at && profile.twitter_bookmark_token_expires_at > now) {
    return profile.twitter_bookmark_access_token;
  }

  // Token expired, refresh it
  console.log('Twitter token expired, refreshing...');
  
  // Basic auth for Twitter API
  const basicAuth = btoa(`${twitterClientId}:${twitterClientSecret}`);
  
  try {
    const refreshTokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.twitter_bookmark_refresh_token
      })
    });

    if (!refreshTokenResponse.ok) {
      const errorText = await refreshTokenResponse.text();
      console.error('Error refreshing Twitter token:', errorText);
      throw new Error(`Failed to refresh Twitter token: ${refreshTokenResponse.status}`);
    }

    const tokenData = await refreshTokenResponse.json();
    
    // Update the user's token information in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        twitter_bookmark_access_token: tokenData.access_token,
        twitter_bookmark_refresh_token: tokenData.refresh_token,
        twitter_bookmark_token_expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating token in database:', updateError);
      throw new Error('Failed to update token in database');
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('Error in refreshTwitterToken:', error);
    throw error;
  }
};

const fetchUserBookmarks = async (accessToken: string, count: number) => {
  try {
    // First fetch the user's Twitter numerical ID
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Error fetching user data:', errorText);
      throw new Error(`Failed to fetch user data: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // Fetch bookmarks with the numerical ID
    const bookmarksResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/bookmarks?max_results=${count}&expansions=author_id&tweet.fields=created_at,public_metrics,entities,text&user.fields=name,username,profile_image_url`, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!bookmarksResponse.ok) {
      const errorText = await bookmarksResponse.text();
      console.error('Error fetching bookmarks:', errorText);
      throw new Error(`Failed to fetch bookmarks: ${bookmarksResponse.status}`);
    }

    return await bookmarksResponse.json();
  } catch (error) {
    console.error('Error in fetchUserBookmarks:', error);
    throw error;
  }
};

const generateNewsletterContent = async (bookmarks: any, preferences: any) => {
  // This would typically call your newsletter generation service
  // For now, we'll just format the bookmarks into a simple newsletter
  
  const tweets = bookmarks.data || [];
  const users = bookmarks.includes?.users || [];
  
  // Map author information to tweets
  const tweetsWithAuthors = tweets.map((tweet: any) => {
    const author = users.find((user: any) => user.id === tweet.author_id);
    return {
      ...tweet,
      author
    };
  });
  
  // Generate some basic newsletter content
  const newsletterTitle = preferences?.newsletter_name || 'My Twitter Digest';
  const newsletterIntro = `Here's your curated collection of ${tweets.length} tweets based on your bookmarks.`;
  
  // Format the tweets for the newsletter
  const formattedTweets = tweetsWithAuthors.map((tweet: any) => {
    return {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      author: {
        name: tweet.author?.name || 'Unknown Author',
        username: tweet.author?.username || 'unknown',
        profile_image_url: tweet.author?.profile_image_url || ''
      },
      public_metrics: tweet.public_metrics
    };
  });
  
  return {
    title: newsletterTitle,
    intro: newsletterIntro,
    tweets: formattedTweets
  };
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get request body
    const requestData: RequestBody = await req.json();
    const { tweetCount, userId } = requestData;
    
    // Ensure the authenticated user matches the requested userId
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Could not fetch user profile', details: profileError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has manual plan (day preference is null or manual)
    const hasManualPlan = !profile.newsletter_day_preference || profile.newsletter_day_preference === 'manual';
    if (!hasManualPlan) {
      return new Response(
        JSON.stringify({ error: 'User does not have a manual newsletter plan' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has remaining generations
    if (profile.remaining_newsletter_generations <= 0) {
      return new Response(
        JSON.stringify({ error: 'No remaining newsletter generations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has Twitter bookmark access
    if (!profile.twitter_bookmark_access_token) {
      return new Response(
        JSON.stringify({ error: 'No Twitter bookmark access. Please connect your Twitter account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Refresh Twitter token if needed
    let accessToken;
    try {
      accessToken = await refreshTwitterToken(userId);
    } catch (error) {
      console.error('Token refresh error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh Twitter token', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch bookmarks
    let bookmarks;
    try {
      bookmarks = await fetchUserBookmarks(accessToken, tweetCount);
    } catch (error) {
      console.error('Bookmark fetch error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookmarks', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate newsletter content
    let newsletterContent;
    try {
      newsletterContent = await generateNewsletterContent(bookmarks, profile.newsletter_content_preferences);
    } catch (error) {
      console.error('Newsletter generation error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate newsletter', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Decrement remaining generations
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        remaining_newsletter_generations: profile.remaining_newsletter_generations - 1
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Update error:', updateError);
      // We'll continue even if the update fails, but log the error
      console.error('Failed to decrement remaining generations:', updateError);
    }
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        newsletter: newsletterContent,
        remaining_generations: profile.remaining_newsletter_generations - 1
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
