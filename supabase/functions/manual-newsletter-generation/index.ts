
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
    const { selectedCount } = await req.json();
    if (!selectedCount || ![10, 20, 30].includes(selectedCount)) {
      return new Response(
        JSON.stringify({ error: "Invalid selection. Please choose 10, 20, or 30 tweets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    if (!profile.subscription_tier) {
      return new Response(
        JSON.stringify({ error: "You must have an active subscription to generate newsletters" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const hasManualPlan = profile.newsletter_day_preference === 'Manual: 4' || profile.newsletter_day_preference === 'Manual: 8';
    if (!hasManualPlan) {
      return new Response(
        JSON.stringify({ error: "You must have a manual newsletter plan to use this feature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!profile.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      return new Response(
        JSON.stringify({ error: "You have no remaining newsletter generations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!profile.twitter_bookmark_access_token) {
      return new Response(
        JSON.stringify({ error: "Twitter bookmark access not authorized. Please connect your Twitter bookmarks in settings." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (profile.twitter_bookmark_token_expires_at && profile.twitter_bookmark_token_expires_at < now) {
      return new Response(
        JSON.stringify({ error: "Twitter bookmark access token has expired. Please reconnect your Twitter bookmarks." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let numericalId = profile.numerical_id;
    if (!numericalId && profile.twitter_handle) {
      try {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY in environment");

        const cleanHandle = profile.twitter_handle.trim().replace('@', '');
        const url = `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(cleanHandle)}`;
        const options = {
          method: "GET",
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": "twitter293.p.rapidapi.com"
          }
        };

        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`RapidAPI returned ${response.status}`);
        const apiResponse = await response.json();

        if (apiResponse?.user?.result?.rest_id) {
          numericalId = apiResponse.user.result.rest_id;
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ numerical_id: numericalId })
            .eq("id", user.id);
          if (updateError) console.error("Error updating numerical_id:", updateError);
        } else {
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

    if (!numericalId) {
      return new Response(
        JSON.stringify({ error: "Could not determine your Twitter ID. Please update your Twitter handle in settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch bookmarks
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
    if (!bookmarksData?.data) {
      console.error("Invalid or empty bookmark data received:", bookmarksData);
      if (bookmarksData?.meta?.result_count === 0) {
        return new Response(
          JSON.stringify({ error: "You don't have any bookmarks. Please save some tweets before generating a newsletter." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to retrieve bookmarks from Twitter");
    }
    const tweetIds = bookmarksData.data.map(tweet => tweet.id);

    // Call Apify for detailed data
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) throw new Error("Missing APIFY_API_KEY environment variable");

    const apifyRequestBody = {
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
      "filter:videos": false,
      "filter:vine": false,
      "include:nativeretweets": false,
      "lang": "en",
      "maxItems": selectedCount,
      "tweetIDs": tweetIds
    };

    const apifyResponse = await fetch(
      `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyRequestBody)
      }
    );
    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error(`Apify API error (${apifyResponse.status}):`, errorText);
      throw new Error(`Apify API error: ${apifyResponse.status}`);
    }

    const apifyData = await apifyResponse.json();
    console.log("Raw Apify response:", JSON.stringify(apifyData, null, 2));

    // Process the tweets from Apify into a better format
    const tweetsArray = Array.isArray(apifyData)
      ? apifyData
      : Array.isArray(apifyData.items)
        ? apifyData.items
        : [];

    // Create a more structured format for the newsletter
    const processedTweets = tweetsArray.map(tweet => {
      // Extract main image if available
      const mainImage = tweet.extendedEntities?.media?.find(m => m.type === "photo")?.media_url_https || null;
      
      // Format date
      let tweetDate = "Unknown date";
      try {
        if (tweet.createdAt) {
          const date = new Date(tweet.createdAt);
          tweetDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        }
      } catch (e) {
        console.error("Date parsing error:", e);
      }

      // Clean up tweet text (remove URLs)
      const cleanText = (tweet.text || "").replace(/https?:\/\/\S+/g, "").trim();
      
      return {
        id: tweet.id,
        text: cleanText,
        authorName: tweet.author?.name || "Unknown Author",
        authorUsername: tweet.author?.userName || "unknown",
        authorProfilePic: tweet.author?.profilePicture || null,
        date: tweetDate,
        stats: {
          likes: tweet.likeCount || 0,
          retweets: tweet.retweetCount || 0,
          replies: tweet.replyCount || 0,
          quotes: tweet.quoteCount || 0,
          impressions: tweet.viewCount || 0,
        },
        isReply: tweet.isReply || false,
        replyingTo: tweet.inReplyToUsername || null,
        mainImage: mainImage,
        isVerified: tweet.author?.isBlueVerified || false,
        originalUrl: `https://twitter.com/${tweet.author?.userName || 'user'}/status/${tweet.id}`,
      };
    });

    // Generate a formatted newsletter content
    const timestamp = new Date().toISOString();
    const newsletterContent = {
      title: `Your Twitter Bookmarks Newsletter - ${new Date().toLocaleDateString()}`,
      intro: "Here are the top tweets from your bookmarks:",
      timestamp: timestamp,
      tweets: processedTweets,
    };

    // Log and return the processed tweets
    console.log("Processed tweets:", JSON.stringify(newsletterContent, null, 2));

    // Now update the profile to decrement the remaining generations
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        remaining_newsletter_generations: profile.remaining_newsletter_generations - 1,
        last_newsletter_generation: timestamp 
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      // Continue anyway as this shouldn't block the newsletter generation
    }

    // Create a record in a newsletters table if one exists
    try {
      const { error: insertError } = await supabase
        .from("newsletters")
        .insert({
          user_id: user.id,
          content: newsletterContent,
          status: "generated",
          tweet_count: processedTweets.length,
          generation_type: "manual"
        });

      if (insertError) {
        console.error("Error inserting newsletter record:", insertError);
        // Continue anyway as this shouldn't block the response
      }
    } catch (error) {
      // If the table doesn't exist, just log and continue
      console.log("Could not save newsletter to database (table may not exist):", error);
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Newsletter generated successfully",
        data: {
          newsletter: newsletterContent,
          remainingGenerations: profile.remaining_newsletter_generations - 1
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in manual-newsletter-generation function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
