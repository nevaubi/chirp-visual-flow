
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = userData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscribed, subscription_tier, subscription_id, subscription_period_end, cancel_at_period_end, remaining_newsletter_generations')
      .eq('id', userId)
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch subscription data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isSubscribed = profile?.subscribed || false;
    const subscriptionTier = profile?.subscription_tier || null;
    const subscriptionId = profile?.subscription_id || null;
    const subscriptionPeriodEnd = profile?.subscription_period_end || null;
    const cancelAtPeriodEnd = profile?.cancel_at_period_end || false;
    const remainingNewsletterGenerations = profile?.remaining_newsletter_generations || 0;

    return new Response(JSON.stringify({
      isSubscribed,
      subscriptionTier,
      subscriptionId,
      subscriptionPeriodEnd,
      cancelAtPeriodEnd,
      remainingNewsletterGenerations
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
