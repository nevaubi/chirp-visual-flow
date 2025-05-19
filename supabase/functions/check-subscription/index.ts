
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
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

    // Create Supabase client with service role key for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { id: user.id, email: user.email });

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Check if this user has a Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      // Update profile to ensure subscription fields are properly set
      await supabaseAdmin.from("profiles").update({
        subscribed: false,
        subscription_tier: null,
        subscription_id: null,
        subscription_period_end: null,
        cancel_at_period_end: false,
        stripe_customer_id: null,
        stripe_price_id: null
      }).eq("id", user.id);
      
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      expand: ["data.items.data.price.product"],
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions found");
      // Update profile to ensure subscription fields are properly set
      await supabaseAdmin.from("profiles").update({
        subscribed: false,
        subscription_tier: null,
        subscription_id: null,
        subscription_period_end: null,
        cancel_at_period_end: false,
        stripe_customer_id: customerId,
        stripe_price_id: null
      }).eq("id", user.id);
      
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Process the active subscription
    const subscription = subscriptions.data[0];
    const subscriptionId = subscription.id;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    
    // Get the price and product details
    const priceId = subscription.items.data[0].price.id;
    const productName = subscription.items.data[0].price.product.name;
    
    // Determine subscription tier from product name
    let subscriptionTier = null;
    if (productName.includes("Creator Basic")) {
      subscriptionTier = "Creator Basic";
    } else if (productName.includes("Creator Pro")) {
      subscriptionTier = "Creator Pro";
    } else if (productName.includes("Newsletter Standard")) {
      subscriptionTier = "Newsletter Standard";
    } else if (productName.includes("Newsletter Premium")) {
      subscriptionTier = "Newsletter Premium";
    }

    logStep("Active subscription found", { 
      subscriptionId, 
      tier: subscriptionTier, 
      priceId,
      periodEnd,
      cancelAtPeriodEnd
    });

    // Update the user's profile with subscription details
    await supabaseAdmin.from("profiles").update({
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_id: subscriptionId,
      subscription_period_end: periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      stripe_customer_id: customerId,
      stripe_price_id: priceId
    }).eq("id", user.id);

    logStep("Updated user profile with subscription details");

    return new Response(JSON.stringify({
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_id: subscriptionId,
      subscription_period_end: periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      stripe_customer_id: customerId,
      stripe_price_id: priceId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CHECK-SUBSCRIPTION] ERROR: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
