
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    
    if (!APIFY_API_KEY) {
      throw new Error("APIFY_API_KEY not found in environment variables");
    }

    const { username } = await req.json();
    
    if (!username) {
      throw new Error("Username is required");
    }

    // Remove @ if present
    const formattedUsername = username.startsWith('@') ? username.substring(1) : username;
    
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log("Apify response:", JSON.stringify(data));

    // Determine if the username is valid based on Apify response
    // If we get any tweets, we consider the username valid
    const isValid = Array.isArray(data) && data.length > 0;
    
    console.log(`Username ${formattedUsername} is ${isValid ? 'valid' : 'invalid'}`);

    return new Response(
      JSON.stringify({
        success: true,
        isValid,
        username: formattedUsername,
        message: isValid ? "Username verified successfully" : "No account found with this username"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error("Error in username verification:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "An error occurred during username verification"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
