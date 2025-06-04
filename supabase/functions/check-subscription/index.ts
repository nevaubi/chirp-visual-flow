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

// Helper function to extract customer ID from either a string or object
const extractCustomerId = (customer: string | any): string => {
  if (!customer) return '';
  
  // If it's already a string, just return it
  if (typeof customer === 'string') return customer;
  
  // If it's an object and has an id property, return that
  if (typeof customer === 'object' && customer.id) return customer.id;
  
  // Otherwise try to parse if it's a JSON string
  if (typeof customer === 'string') {
    try {
      const parsed = JSON.parse(customer);
      if (parsed && parsed.id) return parsed.id;
    } catch (e) {
      // Not valid JSON, return as is
      return customer;
    }
  }
  
  // If all else fails, convert to string
  return String(customer);
};

// Helper function to determine newsletter generation count based on subscription type and price
const determineNewsletterGenerationCount = (preference: string | null | undefined, priceId: string | null | undefined): number => {
  // If it's a newsletter subscription, set a fixed value of 20
  if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH" || priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
    return 20; // Fixed value for newsletter subscriptions
  }
  
  // Otherwise use preference-based logic as fallback
  if (!preference) return 0;
  
  if (preference.includes('Manual: 8')) {
    return 8;
  } else if (preference.includes('Manual: 4')) {
    return 4;
  }
  
  return 0;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Parse request body if present to get session_id
    let sessionId = null;
    if (req.method === "POST") {
      try {
        const requestBody = await req.json();
        sessionId = requestBody.session_id;
      } catch (e) {
        // Not critical if body parsing fails
      }
    }

    // Initialize Supabase client with service role key to update profiles
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header provided");
      return new Response(JSON.stringify({ 
        error: "Authorization header is required",
        subscribed: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the user from the token
    const token = authHeader.replace("Bearer ", "");
    
    // Validate token format
    if (!token || token.length < 10) {
      logStep("ERROR: Invalid token format", { tokenLength: token?.length });
      return new Response(JSON.stringify({ 
        error: "Invalid authorization token",
        subscribed: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let userData;
    try {
      const result = await supabaseAdmin.auth.getUser(token);
      userData = result.data;
      
      if (result.error) {
        logStep("ERROR: Authentication failed", { error: result.error.message });
        return new Response(JSON.stringify({ 
          error: "Authentication failed", 
          details: result.error.message,
          subscribed: false 
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (authError) {
      logStep("ERROR: Token validation failed", { error: authError });
      return new Response(JSON.stringify({ 
        error: "Token validation failed",
        subscribed: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    if (!userData.user) {
      logStep("ERROR: No user found in token");
      return new Response(JSON.stringify({ 
        error: "User not found",
        subscribed: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = userData.user;
    logStep("User authenticated successfully", { userId: user.id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: Stripe secret key not configured");
      return new Response(JSON.stringify({ 
        error: "Payment system not configured",
        subscribed: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // First, check if we have a session ID from a checkout success
    if (sessionId) {
      logStep("Processing checkout session", { sessionId });
      try {
        // Retrieve the checkout session to get customer info
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['customer', 'subscription', 'line_items']
        });
        
        if (!session) {
          return new Response(JSON.stringify({ error: "Session not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        // Extract proper customer ID, handling both string and object cases
        const customerId = extractCustomerId(session.customer);
        
        // Get newsletter preferences from session metadata
        const newsletterDayPreference = session.metadata?.newsletter_day_preference;
        let newsletterContentPreferences = null;
        
        // Check if this is a newsletter subscription by examining price IDs
        let isNewsletterSubscription = false;
        let priceId = null;
        
        if (session.line_items?.data) {
          const lineItems = session.line_items.data;
          for (const item of lineItems) {
            priceId = item.price?.id;
            // Check if it's a newsletter price ID
            if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH" || priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
              isNewsletterSubscription = true;
              break;
            }
          }
        }
        
        // Set remaining_newsletter_generations to 20 for newsletter subscriptions
        let remainingNewsletterGenerations = isNewsletterSubscription 
          ? 20 
          : determineNewsletterGenerationCount(newsletterDayPreference, priceId);
        
        if (session.metadata?.newsletter_content_preferences) {
          try {
            newsletterContentPreferences = JSON.parse(session.metadata.newsletter_content_preferences);
          } catch (error) {
            // Silent error handling
          }
        }
        
        // Update profile with customer ID before checking subscriptions
        if (customerId) {
          const profileUpdates: any = { stripe_customer_id: customerId };
          
          // Add newsletter preferences if available
          if (newsletterDayPreference) {
            profileUpdates.newsletter_day_preference = newsletterDayPreference;
          }
          
          if (newsletterContentPreferences) {
            profileUpdates.newsletter_content_preferences = newsletterContentPreferences;
          }
          
          // Add remaining_newsletter_generations
          profileUpdates.remaining_newsletter_generations = remainingNewsletterGenerations;
          
          const { error: customerUpdateError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', user.id);
            
          if (customerUpdateError) {
            logStep("Warning: Failed to update customer ID", { error: customerUpdateError.message });
            // Continue despite error - we want to try retrieving subscription info
          }
          
          // If we have a subscription in the session, we can use it directly
          if (session.subscription) {
            const subscriptionId = typeof session.subscription === 'string' 
              ? session.subscription 
              : session.subscription.id;
            
            // Retrieve the full subscription with expanded data
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['items.data.price']
            });
            
            if (subscription && subscription.status === 'active') {
              // Get price info
              const priceId = subscription.items.data[0].price.id;
              
              // Determine subscription tier based on price ID
              let subscriptionTier = null;
              
              // Map price IDs to subscription tiers
              if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH") {
                subscriptionTier = "Newsletter Standard";
              } else if (priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
                subscriptionTier = "Newsletter Premium";
              }
              
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
                  stripe_price_id: priceId,
                  remaining_newsletter_generations: remainingNewsletterGenerations
                })
                .eq('id', user.id);
                
              if (updateError) {
                logStep("ERROR: Failed to update profile with subscription", { error: updateError.message });
                return new Response(JSON.stringify({ error: "Failed to update profile", details: updateError.message }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 500,
                });
              }
              
              logStep("Successfully processed checkout session");
              // Return subscription details
              return new Response(JSON.stringify({
                subscribed: true,
                subscription_tier: subscriptionTier,
                subscription_id: subscription.id,
                subscription_period_end: subscriptionPeriodEnd,
                cancel_at_period_end: subscription.cancel_at_period_end,
                stripe_price_id: priceId,
                newsletter_day_preference: newsletterDayPreference,
                newsletter_content_preferences: newsletterContentPreferences,
                remaining_newsletter_generations: remainingNewsletterGenerations
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              });
            }
          }
        }
      } catch (error) {
        logStep("Warning: Checkout session processing failed", { error: error.message });
        // We'll continue with the regular flow below, don't return error response here
      }
    }

    // Fetch user profile to check if they have a Stripe customer ID
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, newsletter_day_preference')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      logStep("Warning: Failed to fetch user profile", { error: profileError.message });
      // For new users, this is expected - return unsubscribed status
      return new Response(JSON.stringify({ subscribed: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if stripe_customer_id is an object instead of a string and extract the ID
    let customerId = null;
    if (profileData.stripe_customer_id) {
      customerId = extractCustomerId(profileData.stripe_customer_id);
      
      // If the extracted ID is different from what's stored, update it
      if (customerId !== profileData.stripe_customer_id) {
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
      }
    }

    // If no Stripe customer ID, user has no subscription
    if (!customerId) {
      logStep("No Stripe customer ID found - user unsubscribed");
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

    logStep("Checking Stripe subscriptions", { customerId });

    // Retrieve active subscriptions for the customer
    let subscriptions;
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        expand: ["data.items.data.price"]
      });
    } catch (stripeError) {
      logStep("ERROR: Failed to retrieve Stripe subscriptions", { error: stripeError.message });
      // If Stripe is having issues, return current state without updating
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If no active subscriptions, update profile and return
    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions found");
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
    logStep("Active subscription found", { subscriptionId: subscription.id });
    
    // Get price info
    const priceId = subscription.items.data[0].price.id;
    
    // Determine subscription tier based on price ID
    let subscriptionTier = null;
    
    // Map price IDs to subscription tiers
    if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH") {
      subscriptionTier = "Newsletter Standard";
    } else if (priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
      subscriptionTier = "Newsletter Premium";
    }

    // Calculate subscription period end
    const subscriptionPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    
    // Determine remaining newsletter generations based on the user's preference
    const remainingNewsletterGenerations = determineNewsletterGenerationCount(profileData.newsletter_day_preference, priceId);
    
    // Update the user's profile with subscription details
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscribed: true,
        subscription_tier: subscriptionTier,
        subscription_id: subscription.id,
        subscription_period_end: subscriptionPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        stripe_price_id: priceId,
        remaining_newsletter_generations: remainingNewsletterGenerations
      })
      .eq('id', user.id);
      
    if (updateError) {
      logStep("ERROR: Failed to update profile with subscription details", { error: updateError.message });
      return new Response(JSON.stringify({ error: "Failed to update profile", details: updateError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Successfully updated subscription status");
    // Return subscription details
    return new Response(JSON.stringify({
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_id: subscription.id,
      subscription_period_end: subscriptionPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_price_id: priceId,
      remaining_newsletter_generations: remainingNewsletterGenerations
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR in check-subscription", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      subscribed: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
