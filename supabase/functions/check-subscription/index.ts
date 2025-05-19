
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role key to update profiles
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header is required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the user from the token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication failed", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Fetch user profile to check if they have a Stripe customer ID
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      logStep("Error fetching profile", profileError);
      return new Response(JSON.stringify({ error: "Failed to fetch user profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // If no Stripe customer ID, user has no subscription
    if (!profileData.stripe_customer_id) {
      logStep("No Stripe customer ID found for user");
      await supabaseAdmin
        .from('profiles')
        .update({
          subscribed: false,
          subscription_tier: null,
          subscription_id: null,
          subscription_period_end: null,
          cancel_at_period_end: false,
          stripe_price_id: null
        })
        .eq('id', user.id);
        
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Retrieve active subscriptions for the customer
    // FIX: Removed excessive nesting in expansion to avoid the 4-level limit error
    const subscriptions = await stripe.subscriptions.list({
      customer: profileData.stripe_customer_id,
      status: "active",
      expand: ["data.items.data.price"]
    });

    // If no active subscriptions, update profile and return
    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions found for customer");
      await supabaseAdmin
        .from('profiles')
        .update({
          subscribed: false,
          subscription_tier: null,
          subscription_id: null,
          subscription_period_end: null,
          cancel_at_period_end: false,
          stripe_price_id: null
        })
        .eq('id', user.id);
        
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get the active subscription
    const subscription = subscriptions.data[0];
    
    // Get price info
    const priceId = subscription.items.data[0].price.id;
    
    // Fetch product information in a separate call to avoid excessive nesting
    const price = subscription.items.data[0].price;
    let productId = null;
    
    try {
      // Check if price has product data, if not fetch it separately
      if (price.product && typeof price.product === 'string') {
        const product = await stripe.products.retrieve(price.product);
        productId = product.id;
        logStep("Retrieved product info", { productId });
      } else if (price.product && typeof price.product === 'object') {
        productId = price.product.id;
      }
    } catch (error) {
      logStep("Error retrieving product", error);
      // Continue despite product error
    }
    
    // Determine subscription tier based on price ID
    let subscriptionTier = null;
    
    // Map price IDs to subscription tiers
    if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH") {
      subscriptionTier = "Newsletter Standard";
    } else if (priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
      subscriptionTier = "Newsletter Premium";
    }
    
    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      priceId, 
      tier: subscriptionTier 
    });

    // Calculate subscription period end
    const subscriptionPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    
    // Update the user's profile with subscription details
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscribed: true,
        subscription_tier: subscriptionTier,
        subscription_id: subscription.id,
        subscription_period_end: subscriptionPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        stripe_price_id: priceId
      })
      .eq('id', user.id);
      
    if (updateError) {
      logStep("Error updating profile", updateError);
      return new Response(JSON.stringify({ error: "Failed to update profile", details: updateError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Profile updated with subscription details");

    // Return subscription details
    return new Response(JSON.stringify({
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_id: subscription.id,
      subscription_period_end: subscriptionPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_price_id: priceId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
