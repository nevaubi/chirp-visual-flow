
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Helper function to determine newsletter generation count based on newsletter_day_preference or subscription
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

// Helper function to determine tweet generation count for Creator platform
const determineTweetGenerationCount = (priceId: string | null | undefined, subscribed: boolean): number => {
  // If it's a Creator platform subscription
  if (priceId === "price_1RRXZ2DBIslKIY5s4gxpBlME") {
    return subscribed ? 150 : 5; // 150 for paid, 5 for free
  }
  
  return 0; // Not a Creator platform subscription
};

// Helper function to determine subscription tier and platform type
const determineSubscriptionDetails = (priceId: string | null | undefined) => {
  let subscriptionTier = null;
  let isCreatorPlatform = false;
  let isNewsletterPlatform = false;
  
  // Map price IDs to subscription tiers and platforms
  if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH") {
    subscriptionTier = "Newsletter Standard";
    isNewsletterPlatform = true;
  } else if (priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
    subscriptionTier = "Newsletter Premium";
    isNewsletterPlatform = true;
  } else if (priceId === "price_1RRXZ2DBIslKIY5s4gxpBlME") {
    subscriptionTier = "Creator";
    isCreatorPlatform = true;
  }
  
  return { subscriptionTier, isCreatorPlatform, isNewsletterPlatform };
};

// Helper function to safely convert timestamp to ISO string
const safeTimestampToISO = (timestamp: number): string | null => {
  try {
    if (!timestamp || timestamp <= 0) {
      return null;
    }
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) {
      logStep("Invalid timestamp", { timestamp });
      return null;
    }
    return date.toISOString();
  } catch (error) {
    logStep("Error converting timestamp", { timestamp, error: error.message });
    return null;
  }
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
        
        // Check if this is a newsletter or creator subscription by examining the line items
        let priceId = null;
        
        if (session.line_items?.data) {
          const lineItems = session.line_items.data;
          for (const item of lineItems) {
            priceId = item.price?.id;
            if (priceId) break;
          }
        }
        
        // Determine subscription details
        const { subscriptionTier, isCreatorPlatform, isNewsletterPlatform } = determineSubscriptionDetails(priceId);
        
        // Set appropriate generation counts
        let remainingNewsletterGenerations = 0;
        let remainingTweetGenerations = null;
        
        if (isNewsletterPlatform) {
          remainingNewsletterGenerations = 20; // Fixed value for newsletter subscriptions
        } else if (isCreatorPlatform) {
          remainingTweetGenerations = 150; // 150 for paid Creator subscription
        }
        
        logStep("Platform and generations determined", { 
          isNewsletterPlatform,
          isCreatorPlatform,
          priceId,
          remainingNewsletterGenerations,
          remainingTweetGenerations
        });
        
        if (customerId && userId) {
          // Update the profile with the customer ID and platform-specific preferences
          const profileUpdates: any = { 
            stripe_customer_id: customerId
          };
          
          // Set platform flags
          if (isCreatorPlatform) {
            profileUpdates.is_creator_platform = true;
            profileUpdates.remaining_tweet_generations = remainingTweetGenerations;
          } else if (isNewsletterPlatform) {
            profileUpdates.is_newsletter_platform = true;
            profileUpdates.remaining_newsletter_generations = remainingNewsletterGenerations;
            
            if (newsletterDayPreference) {
              profileUpdates.newsletter_day_preference = newsletterDayPreference;
            }
            
            if (newsletterContentPreferences) {
              profileUpdates.newsletter_content_preferences = newsletterContentPreferences;
            }
          }
          
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId);
            
          if (updateError) {
            logStep("Error updating profile", updateError);
          } else {
            logStep("Profile updated with checkout session data", { 
              isCreatorPlatform,
              remainingTweetGenerations,
              remainingNewsletterGenerations 
            });
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
        
        // Determine subscription details
        const { subscriptionTier, isCreatorPlatform, isNewsletterPlatform } = determineSubscriptionDetails(priceId);
        
        // Calculate subscription period end safely
        const subscriptionPeriodEnd = safeTimestampToISO(subscription.current_period_end);
        
        if (!subscriptionPeriodEnd) {
          logStep("Invalid subscription period end timestamp", { 
            current_period_end: subscription.current_period_end 
          });
          // Continue processing but with null end date
        }
        
        // Find profiles with this customer ID
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, newsletter_day_preference')
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
          // Determine the generation counts based on platform
          let remainingNewsletterGenerations = 0;
          let remainingTweetGenerations = null;
          
          if (isNewsletterPlatform) {
            remainingNewsletterGenerations = 20;
          } else if (isCreatorPlatform) {
            remainingTweetGenerations = subscription.status === 'active' ? 150 : 5;
          }
          
          logStep("Setting platform generations", { 
            profileId: profile.id, 
            isCreatorPlatform,
            isNewsletterPlatform,
            remainingNewsletterGenerations,
            remainingTweetGenerations
          });
          
          const updateData: any = {
            subscribed: subscription.status === 'active',
            subscription_tier: subscriptionTier,
            subscription_id: subscription.id,
            subscription_period_end: subscriptionPeriodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            stripe_price_id: priceId
          };
          
          // Set platform-specific fields
          if (isCreatorPlatform) {
            updateData.is_creator_platform = true;
            updateData.remaining_tweet_generations = remainingTweetGenerations;
          } else if (isNewsletterPlatform) {
            updateData.is_newsletter_platform = true;
            updateData.remaining_newsletter_generations = remainingNewsletterGenerations;
          }
          
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id);
            
          if (updateError) {
            logStep("Error updating profile", { profileId: profile.id, error: updateError });
          } else {
            logStep("Profile updated with subscription data", { 
              profileId: profile.id, 
              subscriptionTier,
              isCreatorPlatform,
              remainingTweetGenerations,
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
                remaining_newsletter_generations: 0,
                remaining_tweet_generations: 5 // Reset to free tier for Creator platform
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
                remaining_newsletter_generations: 0,
                remaining_tweet_generations: 5 // Reset to free tier for Creator platform
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
