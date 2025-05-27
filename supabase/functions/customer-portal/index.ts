
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
      
    let stripeCustomerId = null;
    
    if (profileError) {
      // Don't return error here, try to find the customer ID from Stripe instead
    } else if (profileData?.stripe_customer_id) {
      stripeCustomerId = typeof profileData.stripe_customer_id === 'string' 
        ? profileData.stripe_customer_id 
        : (profileData.stripe_customer_id as any)?.id || null;
    }

    if (!stripeCustomerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
        
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id);
          
        if (updateError) {
          // Continue anyway since we found the ID
        }
      }
    }

    if (!stripeCustomerId && user.email) {
      try {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id }
        });
        
        stripeCustomerId = newCustomer.id;
        
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id);
          
        if (updateError) {
          // Continue anyway since we have the ID
        }
      } catch (createError) {
        return new Response(JSON.stringify({ error: "Failed to create Stripe customer" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (!stripeCustomerId) {
      return new Response(JSON.stringify({ error: "Could not find or create Stripe customer ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${origin}/dashboard/home`,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError) {
      if (stripeError.message && stripeError.message.includes("No configuration")) {
        return new Response(JSON.stringify({ 
          error: "Stripe Customer Portal is not configured", 
          details: "You need to configure the Customer Portal in your Stripe Dashboard",
          docLink: "https://dashboard.stripe.com/test/settings/billing/portal"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "Failed to create customer portal session", 
        details: stripeError.message,
        stripeErrorCode: stripeError.code 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
