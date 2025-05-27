
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const determineNewsletterGenerationCount = (preference: string | null | undefined, priceId: string | null | undefined): number => {
  if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH" || priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
    return 20;
  }
  
  if (!preference) return 0;
  
  if (preference.includes('Manual: 8')) {
    return 8;
  } else if (preference.includes('Manual: 4')) {
    return 4;
  }
  
  return 0;
};

serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "No stripe signature found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.text();
    if (!body) {
      return new Response(JSON.stringify({ error: "No request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    let event;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return new Response(JSON.stringify({ error: `Webhook Error: ${errorMessage}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        const customerId = session.customer;
        const userId = session.metadata?.user_id;
        const newsletterDayPreference = session.metadata?.newsletter_day_preference;
        
        let newsletterContentPreferences = null;
        if (session.metadata?.newsletter_content_preferences) {
          try {
            newsletterContentPreferences = JSON.parse(session.metadata.newsletter_content_preferences);
          } catch (error) {
            // Continue without preferences
          }
        }
        
        let isNewsletterSubscription = false;
        let priceId = null;
        
        if (session.line_items?.data) {
          const lineItems = session.line_items.data;
          for (const item of lineItems) {
            priceId = item.price?.id;
            if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH" || priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
              isNewsletterSubscription = true;
              break;
            }
          }
        }
        
        let remainingNewsletterGenerations = 20;
        
        if (!isNewsletterSubscription) {
          remainingNewsletterGenerations = determineNewsletterGenerationCount(newsletterDayPreference, priceId);
        }
        
        if (customerId && userId) {
          const profileUpdates: any = { 
            stripe_customer_id: customerId
          };
          
          if (newsletterDayPreference) {
            profileUpdates.newsletter_day_preference = newsletterDayPreference;
          }
          
          if (newsletterContentPreferences) {
            profileUpdates.newsletter_content_preferences = newsletterContentPreferences;
          }
          
          profileUpdates.remaining_newsletter_generations = remainingNewsletterGenerations;
          
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId);
            
          if (updateError) {
            // Continue anyway
          }
        }
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        const customerId = subscription.customer;
        const priceId = subscription.items.data[0].price.id;
        
        let subscriptionTier = null;
        if (priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH") {
          subscriptionTier = "Newsletter Standard";
        } else if (priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr") {
          subscriptionTier = "Newsletter Premium";
        }
        
        const subscriptionPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, newsletter_day_preference')
          .eq('stripe_customer_id', customerId);
          
        if (profilesError) {
          break;
        }
        
        if (profiles.length === 0) {
          break;
        }
        
        for (const profile of profiles) {
          const isNewsletterSubscription = priceId === "price_1RQUm7DBIslKIY5sNlWTFrQH" || 
                                          priceId === "price_1RQUmRDBIslKIY5seHRZm8Gr";
          
          const remainingNewsletterGenerations = isNewsletterSubscription 
            ? 20 
            : determineNewsletterGenerationCount(profile.newsletter_day_preference, priceId);
          
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
            // Continue anyway
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        const customerId = subscription.customer;
        
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('subscription_id', subscription.id);
          
        if (profilesError) {
          const { data: customerProfiles, error: customerProfilesError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId);
            
          if (customerProfilesError) {
            break;
          }
          
          if (customerProfiles.length === 0) {
            break;
          }
          
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
              // Continue anyway
            }
          }
        } else {
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
              // Continue anyway
            }
          }
        }
        break;
      }
      
      default:
        // Unhandled event type
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
