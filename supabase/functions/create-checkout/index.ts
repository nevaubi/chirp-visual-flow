
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
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Valid Newsletter price IDs
const VALID_NEWSLETTER_PRICE_IDS = {
  "price_1RQUm7DBIslKIY5sNlWTFrQH": "Newsletter Standard",
  "price_1RX2YIDBIslKIY5sV4I0E592": "Newsletter Pro"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Validate request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse request body
    const requestData = await req.json();
    const { priceId, platform } = requestData;
    
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Price ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Validate Newsletter price ID
    if (!VALID_NEWSLETTER_PRICE_IDS[priceId]) {
      logStep("Invalid price ID provided", { priceId, validPriceIds: Object.keys(VALID_NEWSLETTER_PRICE_IDS) });
      return new Response(JSON.stringify({ error: "Invalid Newsletter price ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const subscriptionTier = VALID_NEWSLETTER_PRICE_IDS[priceId];
    logStep("Request data", { priceId, platform, subscriptionTier });

    // Initialize Supabase client using anon key (for authentication only)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header is required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
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

    // Check if the user already has a Stripe customer record
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      // Create a new customer if one doesn't exist
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_uid: user.id,
        },
      });
      customerId = newCustomer.id;
      logStep("Created new Stripe customer", { customerId });
      
      // Update the user's profile with the new customerId using service role key
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
        
      if (updateError) {
        logStep("Error updating profile with customer ID", updateError);
        // Continue with checkout even if profile update fails
      }
    }

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Prepare session metadata
    const sessionMetadata = {
      user_id: user.id,
      platform: platform || "newsletter",
      subscription_tier: subscriptionTier
    };

    logStep("Creating checkout session with metadata", sessionMetadata);

    // Create a subscription checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/dashboard/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/checkout-cancel`,
        metadata: sessionMetadata,
      });

      logStep("Checkout session created", { sessionId: session.id });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError) {
      // Log the specific Stripe error for debugging
      logStep("Stripe checkout creation error", { 
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param
      });
      
      return new Response(JSON.stringify({ 
        error: "Failed to create checkout session", 
        details: stripeError.message,
        stripeErrorCode: stripeError.code 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
