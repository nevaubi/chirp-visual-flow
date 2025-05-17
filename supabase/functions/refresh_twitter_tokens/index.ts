import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const TWITTER_CLIENT_ID = Deno.env.get('TWITTER_BOOKMARK_CLIENT_ID');
const TWITTER_CLIENT_SECRET = Deno.env.get('TWITTER_BOOKMARK_CLIENT_SECRET');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!TWITTER_CLIENT_ID) {
    return new Response(JSON.stringify({ success: false, message: 'Missing Twitter client ID' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ success: false, message: 'Missing Supabase environment variables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = Math.floor(Date.now() / 1000);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, twitter_bookmark_refresh_token')
      .lte('twitter_bookmark_token_expires_at', now + 60)
      .not('twitter_bookmark_refresh_token', 'is', null);

    if (error) {
      throw error;
    }

    const refreshed: string[] = [];
    const failed: Record<string, string> = {};

    for (const profile of profiles || []) {
      const refreshToken = profile.twitter_bookmark_refresh_token as string | null;
      if (!refreshToken) continue;

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: TWITTER_CLIENT_ID
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      if (TWITTER_CLIENT_SECRET) {
        const credentials = `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(credentials);
        const encoded = base64Encode(data);
        headers['Authorization'] = `Basic ${encoded}`;
      }

      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        const text = await response.text();
        failed[profile.id] = text;
        continue;
      }

      const tokenData = await response.json();
      const expiresAt = Math.floor(Date.now() / 1000) + (tokenData.expires_in || 0);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          twitter_bookmark_access_token: tokenData.access_token,
          twitter_bookmark_refresh_token: tokenData.refresh_token,
          twitter_bookmark_token_expires_at: expiresAt
        })
        .eq('id', profile.id);

      if (updateError) {
        failed[profile.id] = updateError.message;
      } else {
        refreshed.push(profile.id);
      }
    }

    return new Response(JSON.stringify({ success: true, refreshed, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

