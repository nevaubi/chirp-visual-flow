
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const { handle, id, conversionType } = await req.json();

    // Get RapidAPI key from environment
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    if (!RAPIDAPI_KEY) {
      throw new Error("Missing RAPIDAPI_KEY in environment");
    }

    // Handle to ID conversion
    if (conversionType === "handle2id" && handle) {
      const cleanHandle = handle.trim().replace('@', '');
      
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
          profile_image_url_https: user.legacy?.profile_image_url_https || ""
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
          profile_image_url_https: user.legacy?.profile_image_url_https || ""
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
