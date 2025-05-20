
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Redis keys will be prefixed with this to avoid collisions
const REDIS_PREFIX = 'twitter_data:';

// Function to store data in Redis
async function storeInRedis(key: string, data: unknown, expireInDays = 30): Promise<boolean> {
  try {
    const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    
    if (!REDIS_URL || !REDIS_TOKEN) {
      console.error('Redis credentials not found');
      return false;
    }

    const fullKey = `${REDIS_PREFIX}${key}`;
    console.log(`Storing data in Redis with key: ${fullKey}`);
    
    const url = `${REDIS_URL}/set/${fullKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: JSON.stringify(data),
        ex: expireInDays * 24 * 60 * 60 // Expire time in seconds
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Redis storage error:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('Redis storage result:', result);
    return result.result === 'OK';
  } catch (error) {
    console.error('Error storing data in Redis:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client using environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get API key from environment
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) {
      throw new Error("APIFY_API_KEY not found in environment variables");
    }

    // Parse request body
    const { username, userId, timezone } = await req.json();
    if (!username) {
      throw new Error("Username is required");
    }
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    // Log received timezone to verify it's coming through correctly
    console.log(`Received timezone from frontend: ${timezone}`);

    // Get user profile from database to compare usernames later
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('twitter_username')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Could not retrieve user profile");
    }

    // Remove @ if present in submitted username
    const formattedUsername = username.startsWith('@')
      ? username.substring(1)
      : username;
    console.log(`Verifying username: ${formattedUsername}`);

    // Prepare the request to Apify
    const apifyUrl = `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`;
    const requestBody = {
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
      "from": formattedUsername,
      "include:nativeretweets": false,
      "lang": "en",
      "maxItems": 10,
      "queryType": "Top"
    };
    console.log("Sending request to Apify with payload:", JSON.stringify(requestBody));

    // Make the API call to Apify
    const response = await fetch(apifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    const data = await response.json();
    console.log("Apify response:", JSON.stringify(data));

    // Determine if the username is valid based on Apify response
    const isValid = Array.isArray(data) && data.length > 0;
    console.log(`Username ${formattedUsername} is ${isValid ? 'valid' : 'invalid'}`);

    // If not valid, return early
    if (!isValid) {
      return new Response(JSON.stringify({
        success: false,
        isValid: false,
        username: formattedUsername,
        message: "No account found with this username"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse only the first tweet's author fields when valid
    let parsedFields = {};
    if (isValid) {
      const firstTweet = data[0];
      const author = firstTweet.author || {};

      parsedFields = {
        twitter_handle: author.userName,
        numerical_id: author.id,
        twitter_username: author.name,
        is_verified: author.isBlueVerified,
        location: author.location,
        follower_count: author.followers,
        following_count: author.following,
        account_creation_date: author.createdAt,
        total_posts: author.statusesCount,
        bio: author.profile_bio?.description ?? ""
      };
      
      // Store user profile info in Redis
      try {
        // Use waitUntil to run Redis storage in the background
        const redisData = {
          user_id: userId,
          ...parsedFields,
          verified_at: new Date().toISOString(),
          twitter_data: author,
        };
        
        const storagePromise = storeInRedis(`user:${userId}:profile`, redisData, 90);
        EdgeRuntime.waitUntil(storagePromise);
        
        console.log('Redis storage task for user profile started in the background');
      } catch (redisError) {
        // Just log the error, don't fail the function
        console.error('Error starting Redis profile storage task:', redisError);
      }
    }

    // Verification step: Compare retrieved twitter username with user's stored username
    // If the profile has a twitter_username, we compare it with the returned one
    // Note: profileData.twitter_username might be null for new users, in that case we skip this check
    if (profileData.twitter_username !== null && 
        parsedFields.twitter_username !== profileData.twitter_username) {
      console.log(`Username mismatch: API returned ${parsedFields.twitter_username} but profile has ${profileData.twitter_username}`);
      return new Response(JSON.stringify({
        success: false,
        isValid: false,
        username: formattedUsername,
        message: "The account username doesn't match your profile. Please check your account handle spelling and try again.",
        detectedUsername: parsedFields.twitter_username
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Initialize the update data with parsed fields
    const updateData = {
      ...parsedFields,
    };
    
    // IMPORTANT CHANGE: Always prioritize user-selected timezone from dropdown
    // Only add timezone if it was provided from the frontend
    if (timezone) {
      updateData.timezone = timezone;
      console.log(`Using user-selected timezone: ${timezone}`);
    } else {
      console.log("No timezone provided from frontend");
    }
    
    console.log("Updating profile with data:", JSON.stringify(updateData));
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);
      
    if (updateError) {
      console.error("Error updating profile:", updateError);
      // Continue with the response even if the update failed
      // We'll report this in the response
    }

    // Return the combined response for successful verification
    return new Response(JSON.stringify({
      success: true,
      isValid: true,
      username: formattedUsername,
      message: "Username verified successfully",
      profileUpdated: !updateError,
      updateError: updateError ? updateError.message : null,
      ...parsedFields
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error("Error in username verification:", error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || "An error occurred during username verification"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
