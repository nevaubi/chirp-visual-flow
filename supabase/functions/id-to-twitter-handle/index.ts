
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const RATE_LIMIT = 10;
const FEATURE_NAME = "tweet_id_converter";
const REDIS_TTL = 86400;

const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      return { allowed: true, remaining: RATE_LIMIT };
    }

    const redisKey = `${FEATURE_NAME}:${ip}:count`;
    
    const response = await fetch(`${UPSTASH_REDIS_REST_URL}/incr/${redisKey}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Redis API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const count = result.result;
    
    if (count === 1) {
      const ttlResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/expire/${redisKey}/${REDIS_TTL}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`
        }
      });
      
      if (!ttlResponse.ok) {
        // Continue anyway
      }
    }
    
    const allowed = count <= RATE_LIMIT;
    const remaining = Math.max(0, RATE_LIMIT - count);
    
    return { allowed, remaining };
    
  } catch (error) {
    return { allowed: true, remaining: RATE_LIMIT };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    
    const rateLimitCheck = await checkRateLimit(clientIP);
    
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        message: "You've reached the daily limit of 10 requests. Try again tomorrow.",
        remaining: 0,
        error_code: "RATE_LIMIT",
        rate_limit: {
          remaining: 0,
          daily_limit: RATE_LIMIT
        }
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const { id } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({
        error: "ID is required",
        message: "Please enter a Twitter user ID",
        error_code: "MISSING_INPUT"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    if (!RAPIDAPI_KEY) {
      throw new Error("Missing RAPIDAPI_KEY in environment");
    }

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
