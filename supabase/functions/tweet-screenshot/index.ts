
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 5 requests per day per IP
const RATE_LIMIT = 5;
const FEATURE_NAME = "tweet_screenshot";
const REDIS_TTL = 86400; // 24 hours in seconds

// Get Redis connection details from environment
const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

// Check and update rate limit using Redis
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    // Skip rate limiting if Redis is not configured
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      console.warn("Redis not configured, skipping rate limiting");
      return { allowed: true, remaining: RATE_LIMIT };
    }

    const redisKey = `${FEATURE_NAME}:${ip}:count`;
    
    // Use Upstash Redis REST API to increment the counter
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
    
    // If this is the first request, set expiry (TTL)
    if (count === 1) {
      const ttlResponse = await fetch(`${UPSTASH_REDIS_REST_URL}/expire/${redisKey}/${REDIS_TTL}`, {
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`
        }
      });
      
      if (!ttlResponse.ok) {
        console.error(`Failed to set TTL: ${ttlResponse.status} ${ttlResponse.statusText}`);
      }
    }
    
    // Check if rate limit is exceeded
    const allowed = count <= RATE_LIMIT;
    const remaining = Math.max(0, RATE_LIMIT - count);
    
    return { allowed, remaining };
    
  } catch (error) {
    // Log the error but don't fail the request
    console.error("Rate limit check failed:", error);
    // Fallback: allow the request
    return { allowed: true, remaining: RATE_LIMIT };
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP address
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    
    // Check rate limit
    const rateLimitCheck = await checkRateLimit(clientIP);
    
    // If rate limit exceeded
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        message: "You've reached the daily limit of 5 requests. Try again tomorrow.",
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

    const { tweetUrl, theme = "light" } = await req.json();

    // Input validation
    if (!tweetUrl) {
      return new Response(JSON.stringify({
        error: "Missing URL",
        message: "Please enter a tweet URL",
        error_code: "MISSING_INPUT"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    if (!tweetUrl.includes("twitter.com") && !tweetUrl.includes("x.com")) {
      return new Response(JSON.stringify({
        error: "Invalid URL format",
        message: "Please enter a valid Twitter/X URL (format: https://twitter.com/username/status/123456789)",
        error_code: "INVALID_URL"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Extract tweet ID
    const match = tweetUrl.match(/status\/(\d+)(?:\/(?:photo|video).*)?$/);
    if (!match?.[1]) {
      return new Response(JSON.stringify({
        error: "Invalid tweet URL",
        message: "Could not extract tweet ID from URL. Please check the format (https://twitter.com/username/status/123456789)",
        error_code: "INVALID_TWEET_URL"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    const tweetId = match[1];

    // Call RapidAPI Tweet-Screenshot service
    const rapidUrl = "https://screenshot-twitter-x.p.rapidapi.com/screenshot";
    const rapidOptions = {
      method: "POST",
      headers: {
        "x-rapidapi-key": Deno.env.get("RAPIDAPI_KEY") ?? "",
        "x-rapidapi-host": "screenshot-twitter-x.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: tweetUrl,
        light_mode: theme === "dark" ? "dim" : "light",
        transparent: false,
        padding: 50,
        format: "base64",
      }),
    };

    const rapidRes = await fetch(rapidUrl, rapidOptions);
    if (!rapidRes.ok) {
      const errText = await rapidRes.text();
      console.error("RapidAPI error:", errText);
      return new Response(JSON.stringify({
        error: "Screenshot API error",
        message: "Failed to generate screenshot.",
        details: errText,
        error_code: "API_ERROR"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const imageBase64 = await rapidRes.text();

    // Success response
    return new Response(JSON.stringify({
      success: true,
      tweetId,
      theme,
      image: imageBase64,
      rate_limit: { 
        remaining: rateLimitCheck.remaining, 
        daily_limit: RATE_LIMIT 
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("Error in tweet screenshot:", err);
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
