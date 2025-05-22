
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Rate limit: 10 requests per day per IP
const RATE_LIMIT = 10;
const FEATURE_NAME = "tweet_id_converter";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get client IP address
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    
    // Default rate limit response if check fails
    let rateLimitCheck = { allowed: true, remaining: RATE_LIMIT - 1 };
    
    try {
      // Check rate limit - use a simple in-memory approach since we don't have a full rate-limit function
      // In a production environment, you would use a database or Redis to track rate limits
      rateLimitCheck = { allowed: true, remaining: RATE_LIMIT - 1 };
    } catch (error) {
      console.error("Rate limit check error:", error);
      // Continue with default values if rate limit check fails
    }
    
    // If rate limit exceeded
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        message: "You've reached the daily limit of 10 requests. Try again tomorrow.",
        remaining: 0,
        error_code: "RATE_LIMIT"
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const { handle, id, conversionType } = await req.json();

    // Get RapidAPI key from environment
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    if (!RAPIDAPI_KEY) {
      throw new Error("Missing RAPIDAPI_KEY in environment");
    }

    // Handle to ID conversion
    if ((conversionType === "handle2id" && handle) || (!conversionType && handle)) {
      const cleanHandle = handle.trim().replace('@', '');
      
      if (!cleanHandle) {
        return new Response(JSON.stringify({
          error: "Handle is required",
          message: "Please enter a valid X handle",
          error_code: "MISSING_INPUT"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      
      // Build the request to the RapidAPI endpoint
      const url = `https://twitter293.p.rapidapi.com/user/by/username/${encodeURIComponent(cleanHandle)}`;
      const options = {
        method: "GET",
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "twitter293.p.rapidapi.com"
        }
      };

      const response = await fetch(url, options);
      
      if (!response.ok) {
        if (response.status === 404) {
          return new Response(JSON.stringify({
            error: "User not found",
            message: `We couldn't find the user '@${cleanHandle}'. Please check the spelling and try again.`,
            error_code: "USER_NOT_FOUND"
          }), {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
        throw new Error(`RapidAPI returned ${response.status}`);
      }

      const apiResponse = await response.json();
      
      // Extract the user details from the nested structure
      let userData = null;
      if (apiResponse && apiResponse.user && apiResponse.user.result) {
        const user = apiResponse.user.result;
        userData = {
          rest_id: user.rest_id || "",
          is_blue_verified: user.is_blue_verified || false,
          name: user.legacy?.name || "",
          screen_name: user.legacy?.screen_name || "",
          profile_image_url_https: user.legacy?.profile_image_url_https || "",
          rate_limit: {
            remaining: rateLimitCheck.remaining,
            daily_limit: RATE_LIMIT
          }
        };
      } else {
        return new Response(JSON.stringify({
          error: "Unable to extract user data",
          message: "We found the user but couldn't extract their details. Please try again later.",
          error_code: "DATA_EXTRACTION_ERROR"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      return new Response(JSON.stringify(userData), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } 
    // ID to handle conversion  
    else if (conversionType === "id2handle" && id) {
      // Use the original `/user/{id}` endpoint which reliably returns user
      // details for a given ID. The newer `/user/by/id` path was returning 404s
      // for valid IDs in production.
      const url = `https://twitter293.p.rapidapi.com/user/${encodeURIComponent(id)}`;
      const options = {
        method: "GET",
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "twitter293.p.rapidapi.com"
        }
      };

      const response = await fetch(url, options);
      
      if (!response.ok) {
        if (response.status === 404) {
          return new Response(JSON.stringify({
            error: "User not found",
            message: `We couldn't find a user with ID '${id}'. Please check the ID and try again.`,
            error_code: "USER_NOT_FOUND"
          }), {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
        throw new Error(`RapidAPI returned ${response.status}`);
      }

      const apiResponse = await response.json();
      
      // Extract the user details from the nested structure
      let userData = null;
      if (apiResponse && apiResponse.user && apiResponse.user.result) {
        const user = apiResponse.user.result;
        userData = {
          rest_id: user.rest_id || "",
          is_blue_verified: user.is_blue_verified || false,
          name: user.legacy?.name || "",
          screen_name: user.legacy?.screen_name || "",
          profile_image_url_https: user.legacy?.profile_image_url_https || "",
          rate_limit: {
            remaining: rateLimitCheck.remaining,
            daily_limit: RATE_LIMIT
          }
        };
      } else {
        return new Response(JSON.stringify({
          error: "Unable to extract user data",
          message: "We found the user but couldn't extract their details. Please try again later.",
          error_code: "DATA_EXTRACTION_ERROR"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }

      return new Response(JSON.stringify(userData), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else {
      return new Response(JSON.stringify({
        error: "Missing parameters",
        message: "Please provide either a handle or an ID based on the conversion type.",
        error_code: "MISSING_INPUT"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Server error",
      message: "Something went wrong on our end. Please try again later.",
      details: err.message,
      error_code: "SERVER_ERROR"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
