
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { selectedCount } = await req.json();
    
    // Validate input
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(
        JSON.stringify({ error: "Invalid selection. Please choose 10, 20, or 30 tweets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Setup Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile with additional fields needed for numerical_id check
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, newsletter_day_preference, remaining_newsletter_generations, sending_email, newsletter_content_preferences, twitter_bookmark_access_token, twitter_bookmark_refresh_token, twitter_bookmark_token_expires_at, numerical_id, twitter_handle")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify subscription status
    if (!profile.subscription_tier) {
      return new Response(
        JSON.stringify({ error: "You must have an active subscription to generate newsletters" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has a manual plan
    const hasManualPlan = profile.newsletter_day_preference === 'Manual: 4' || profile.newsletter_day_preference === 'Manual: 8';
    if (!hasManualPlan) {
      return new Response(
        JSON.stringify({ error: "You must have a manual newsletter plan to use this feature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check remaining generations
    if (!profile.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      return new Response(
        JSON.stringify({ error: "You have no remaining newsletter generations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if Twitter bookmark tokens exist
    if (!profile.twitter_bookmark_access_token) {
      return new Response(
        JSON.stringify({ error: "Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if tokens are expired
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    if (profile.twitter_bookmark_token_expires_at && profile.twitter_bookmark_token_expires_at < now) {
      return new Response(
        JSON.stringify({ error: "Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If numerical_id is missing, we need to generate it using the twitter handle
    let numericalId = profile.numerical_id;
    
    if (!numericalId && profile.twitter_handle) {
      try {
        // Get RapidAPI key from environment
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) {
          console.error("Missing RAPIDAPI_KEY in environment");
          return new Response(
            JSON.stringify({ error: "Server configuration error. Please contact support." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Clean the handle (remove @ if present)
        const cleanHandle = profile.twitter_handle.trim().replace('@', '');
        
        // Build the request to the RapidAPI endpoint
        const url = `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(cleanHandle)}`;
        const options = {
          method: "GET",
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "twitter293.p.rapidapi.com"
          }
        };

        console.log(`Fetching numerical ID for handle: ${cleanHandle}`);
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`RapidAPI returned ${response.status}`);
        }

        const apiResponse = await response.json();
        
        // Extract the user ID from the nested structure
        if (apiResponse && apiResponse.user && apiResponse.user.result && apiResponse.user.result.rest_id) {
          numericalId = apiResponse.user.result.rest_id;
          
          // Update the user's profile with the numerical_id
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ numerical_id: numericalId })
            .eq("id", user.id);
          
          if (updateError) {
            console.error("Error updating numerical_id:", updateError);
            // We'll continue even if the update fails since we have the ID for this session
          } else {
            console.log(`Successfully updated numerical_id to ${numericalId} for user ${user.id}`);
          }
        } else {
          console.error("Could not extract user ID from API response:", apiResponse);
          throw new Error("Could not retrieve your Twitter ID. Please try again later.");
        }
      } catch (error) {
        console.error("Error fetching numerical_id:", error);
        return new Response(
          JSON.stringify({ error: "Could not retrieve your Twitter ID. Please try again later." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check that we now have a numerical_id
    if (!numericalId) {
      return new Response(
        JSON.stringify({ error: "Could not determine your Twitter ID. Please update your Twitter handle in settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now fetch bookmarks from Twitter API
    try {
      console.log(`Fetching ${selectedCount} bookmarks for user with numerical_id: ${numericalId}`);
      
      // Prepare Twitter API request
      // We'll add expansions and tweet fields to get comprehensive tweet data
      const bookmarksUrl = `https://api.twitter.com/2/users/${numericalId}/bookmarks?max_results=${selectedCount}&expansions=author_id,attachments.media_keys&tweet.fields=created_at,text,public_metrics,entities&user.fields=name,username,profile_image_url`;
      
      const bookmarksOptions = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${profile.twitter_bookmark_access_token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const bookmarksResponse = await fetch(bookmarksUrl, bookmarksOptions);
      
      if (!bookmarksResponse.ok) {
        const errorText = await bookmarksResponse.text();
        console.error(`Twitter API error (${bookmarksResponse.status}):`, errorText);
        
        if (bookmarksResponse.status === 401) {
          return new Response(
            JSON.stringify({ error: "Your Twitter access token is invalid. Please reconnect your Twitter bookmarks." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else if (bookmarksResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Twitter API rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error(`Twitter API error: ${bookmarksResponse.status}`);
      }
      
      const bookmarksData = await bookmarksResponse.json();
      
      // Log the full Twitter API response for debugging
      console.log("Full Twitter API response:", JSON.stringify(bookmarksData, null, 2));
      
      // Validate bookmark data
      if (!bookmarksData || !bookmarksData.data) {
        console.error("Invalid or empty bookmark data received:", bookmarksData);
        
        if (bookmarksData && bookmarksData.errors) {
          console.error("Twitter API errors:", bookmarksData.errors);
        }
        
        if (bookmarksData && bookmarksData.meta && bookmarksData.meta.result_count === 0) {
          return new Response(
            JSON.stringify({ error: "You don't have any bookmarks. Please save some tweets before generating a newsletter." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error("Failed to retrieve bookmarks from Twitter");
      }
      
      console.log(`Successfully retrieved ${bookmarksData.data.length} bookmarks`);
      
      // At this point, the user is authenticated, has a valid subscription with a manual plan, has remaining generations,
      // and we've successfully fetched their bookmarks
      return new Response(
        JSON.stringify({
          status: "success",
          message: "Bookmarks retrieved successfully",
          data: {
            selectedCount,
            email: profile.sending_email,
            preferences: profile.newsletter_content_preferences,
            numerical_id: numericalId,
            bookmarks: bookmarksData
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch your bookmarks. Please try again later." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
