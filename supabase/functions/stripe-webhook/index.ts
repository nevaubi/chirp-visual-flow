
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Helper function to determine newsletter generation count based on subscription tier
const determineNewsletterGenerationCount = (priceId: string | null | undefined): number => {
  // Newsletter subscription tiers based on price IDs
  if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH") {
    return 20; // Newsletter Standard
  } else if (priceId === "price_1RX2YIDBIslKIY5sV4I0E592") {
    return 30; // Newsletter Pro
  }
  
  // Default to 0 for unknown price IDs
  return 0;
};

// Helper function to determine subscription tier based on price ID
const determineSubscriptionTier = (priceId: string | null | undefined): string | null => {
  if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH") {
    return "Newsletter Standard";
  } else if (priceId === "price_1RX2YIDBIslKIY5sV4I0E592") {
    return "Newsletter Pro";
  }
  
  return null;
};

serve(async (req) => {
  try {
    logStep("Webhook received");
    
    // Get the stripe signature from the request headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("No stripe signature found");
      return new Response(JSON.stringify({ error: "No stripe signature found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get the raw request body as text
    const body = await req.text();
    if (!body) {
      logStep("No request body");
      return new Response(JSON.stringify({ error: "No request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Verify the webhook signature
    let event;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("Webhook secret not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logStep(`Webhook signature verification failed: ${errorMessage}`);
      return new Response(JSON.stringify({ error: `Webhook Error: ${errorMessage}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    logStep("Webhook verified", { event: event.type });

    // Initialize Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        logStep("Checkout session completed", { sessionId: session.id });
        
        // Extract customer ID and metadata
        const customerId = session.customer;
        const userId = session.metadata?.user_id;
        const newsletterDayPreference = session.metadata?.newsletter_day_preference;
        
        // Parse newsletter content preferences if available
        let newsletterContentPreferences = null;
        if (session.metadata?.newsletter_content_preferences) {
          try {
            newsletterContentPreferences = JSON.parse(session.metadata.newsletter_content_preferences);
          } catch (error) {
            logStep("Error parsing newsletter content preferences", error);
          }
        }
        
        // Check if this is a newsletter subscription by examining the line items
        let isNewsletterSubscription = false;
        let priceId = null;
        
        if (session.line_items?.data) {
          const lineItems = session.line_items.data;
          for (const item of lineItems) {
            priceId = item.price?.id;
            // Check if it's a newsletter price ID
            if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH" || priceId === "price_1RX2YIDBIslKIY5sV4I0E592") {
              isNewsletterSubscription = true;
              break;
            }
          }
        }
        
        // Set remaining newsletter generations based on subscription tier
        const remainingNewsletterGenerations = isNewsletterSubscription 
          ? determineNewsletterGenerationCount(priceId)
          : 0;
        
        logStep("Newsletter generations determined", { 
          isNewsletterSubscription, 
          priceId,
          remainingNewsletterGenerations
        });
        
        if (customerId && userId) {
          // Update the profile with the customer ID and newsletter preferences
          const profileUpdates: any = { 
            stripe_customer_id: customerId
          };
          
          if (newsletterDayPreference) {
            profileUpdates.newsletter_day_preference = newsletterDayPreference;
          }
          
          if (newsletterContentPreferences) {
            profileUpdates.newsletter_content_preferences = newsletterContentPreferences;
          }
          
          // Set the remaining_newsletter_generations based on tier
          profileUpdates.remaining_newsletter_generations = remainingNewsletterGenerations;
          
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId);
            
          if (updateError) {
            logStep("Error updating profile", updateError);
          } else {
            logStep("Profile updated with checkout session data", { remainingNewsletterGenerations });
          }
        }
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        logStep(`Subscription ${event.type === 'customer.subscription.created' ? 'created' : 'updated'}`, { 
          subscriptionId: subscription.id 
        });
        
        // Get customer ID
        const customerId = subscription.customer;
        
        // Get price information
        const priceId = subscription.items.data[0].price.id;
        
        // Determine subscription tier and generation count based on price ID
        const subscriptionTier = determineSubscriptionTier(priceId);
        const remainingNewsletterGenerations = determineNewsletterGenerationCount(priceId);
        
        // Calculate subscription period end
        const subscriptionPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Find profiles with this customer ID
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId);
          
        if (profilesError) {
          logStep("Error fetching profiles", profilesError);
          break;
        }
        
        if (profiles.length === 0) {
          logStep("No profiles found with customer ID", { customerId });
          break;
        }
        
        // Update each profile
        for (const profile of profiles) {
          logStep("Setting newsletter generations", { 
            profileId: profile.id, 
            subscriptionTier,
            remainingNewsletterGenerations
          });
          
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              subscribed: subscription.status === 'active',
              subscription_tier: subscriptionTier,
              subscription_id: subscription.id,
              subscription_period_end: subscriptionPeriodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end,
              stripe_price_id: priceId,
              remaining_newsletter_generations: remainingNewsletterGenerations
            })
            .eq('id', profile.id);
            
          if (updateError) {
            logStep("Error updating profile", { profileId: profile.id, error: updateError });
          } else {
            logStep("Profile updated with subscription data", { 
              profileId: profile.id, 
              subscriptionTier,
              remainingNewsletterGenerations 
            });
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        logStep("Subscription deleted", { subscriptionId: subscription.id });
        
        // Get customer ID
        const customerId = subscription.customer;
        
        // Find profiles with this subscription ID
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('subscription_id', subscription.id);
          
        if (profilesError) {
          logStep("Error fetching profiles by subscription ID", profilesError);
          
          // Fall back to finding by customer ID
          const { data: customerProfiles, error: customerProfilesError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId);
            
          if (customerProfilesError) {
            logStep("Error fetching profiles by customer ID", customerProfilesError);
            break;
          }
          
          if (customerProfiles.length === 0) {
            logStep("No profiles found with customer ID", { customerId });
            break;
          }
          
          // Update each profile found by customer ID
          for (const profile of customerProfiles) {
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                subscribed: false,
                subscription_tier: null,
                subscription_id: null,
                subscription_period_end: null,
                cancel_at_period_end: false,
                stripe_price_id: null,
                remaining_newsletter_generations: 0
              })
              .eq('id', profile.id);
              
            if (updateError) {
              logStep("Error updating profile", { profileId: profile.id, error: updateError });
            } else {
              logStep("Profile updated after subscription deletion", { profileId: profile.id });
            }
          }
        } else {
          // Update each profile found by subscription ID
          for (const profile of profiles) {
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                subscribed: false,
                subscription_tier: null,
                subscription_id: null,
                subscription_period_end: null,
                cancel_at_period_end: false,
                stripe_price_id: null,
                remaining_newsletter_generations: 0
              })
              .eq('id', profile.id);
              
            if (updateError) {
              logStep("Error updating profile", { profileId: profile.id, error: updateError });
            } else {
              logStep("Profile updated after subscription deletion", { profileId: profile.id });
            }
          }
        }
        break;
      }
      
      default:
        logStep(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
