
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Get Twitter auth credentials from Supabase secrets
const TWITTER_CLIENT_ID = Deno.env.get('TWITTER_BOOKMARK_CLIENT_ID');
const TWITTER_CLIENT_SECRET = Deno.env.get('TWITTER_BOOKMARK_CLIENT_SECRET');
const TWITTER_REDIRECT_URI = Deno.env.get('TWITTER_BOOKMARK_REDIRECT_URI');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (!TWITTER_CLIENT_ID || !TWITTER_REDIRECT_URI) {
      throw new Error("Missing Twitter credentials in environment variables");
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { code, verifier, userId, timezone } = await req.json();
    
    if (!code || !verifier || !userId) {
      return new Response(JSON.stringify({ success: false, message: 'Missing parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log("Received parameters:", { code: "REDACTED", verifier: "REDACTED", userId, timezone });
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: TWITTER_REDIRECT_URI,
      code,
      code_verifier: verifier
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (TWITTER_CLIENT_SECRET) {
      // Use the Deno standard library's base64 encoder instead of btoa
      const credentialsString = `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(credentialsString);
      const encodedCredentials = base64Encode(data);
      headers['Authorization'] = `Basic ${encodedCredentials}`;
      
      console.log("Using client ID and secret for Basic auth");
    } else {
      console.log("WARNING: No client secret provided");
    }

    console.log("Request headers:", JSON.stringify(headers));
    console.log("Request body params:", body.toString());

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Twitter token exchange error:", errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = Math.floor(Date.now() / 1000) + (tokenData.expires_in || 0);
    
    // Prepare profile updates with the token information
    const profileUpdates: Record<string, any> = {
      twitter_bookmark_access_token: tokenData.access_token,
      twitter_bookmark_refresh_token: tokenData.refresh_token,
      twitter_bookmark_token_expires_at: expiresAt
    };
    
    // Add timezone to updates if provided
    if (timezone) {
      console.log("Adding timezone to profile update:", timezone);
      profileUpdates.timezone = timezone;
    }
    
    // Store tokens and timezone (if provided) in the profiles table
    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (error) {
      console.error("Error updating profile:", error);
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true,
      expiresAt,
      timezoneUpdated: !!timezone
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error("Error in edge function:", message);
    return new Response(JSON.stringify({ success: false, message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
