
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANUAL-NEWSLETTER-GENERATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client with service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    logStep('Function started');
    
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
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication failed", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = userData.user;
    logStep('User authenticated', { userId: user.id });

    // Parse request body
    const { selectedCount } = await req.json();
    logStep('Request parsed', { selectedCount });

    // Get user profile with current remaining generations
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('remaining_newsletter_generations')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep('Error fetching profile', { error: profileError });
      return new Response(JSON.stringify({ error: "Failed to fetch user profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const currentRemaining = profile.remaining_newsletter_generations || 0;
    logStep('Current remaining generations', { currentRemaining });

    // Check if user has enough generations remaining
    if (currentRemaining <= 0) {
      return new Response(JSON.stringify({ 
        error: "No newsletter generations remaining",
        remainingGenerations: 0
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // IMMEDIATELY deduct one generation (atomic operation)
    const newRemainingCount = currentRemaining - 1;
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ 
        remaining_newsletter_generations: newRemainingCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .eq('remaining_newsletter_generations', currentRemaining); // Ensures atomic update

    if (deductError) {
      logStep('Error deducting generation count', { error: deductError });
      return new Response(JSON.stringify({ error: "Failed to deduct newsletter generation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    logStep('Successfully deducted generation count', { 
      previousCount: currentRemaining, 
      newCount: newRemainingCount 
    });

    // Background task for actual newsletter generation
    const backgroundNewsletterGeneration = async () => {
      try {
        logStep('Starting background newsletter generation', { userId: user.id, selectedCount });
        
        // Add to newsletter queue
        const { error: queueError } = await supabase
          .from('newsletter_queue')
          .insert({
            user_id: user.id,
            scheduled_date: new Date().toISOString(),
            is_newsletter_sent: 'false',
            attempt_count: 0
          });

        if (queueError) {
          throw new Error(`Failed to add to queue: ${queueError.message}`);
        }

        logStep('Successfully added to newsletter queue');

        // Call the process-newsletter-queue function to trigger immediate processing
        const { error: processError } = await supabase.functions.invoke('process-newsletter-queue');
        
        if (processError) {
          logStep('Error calling process-newsletter-queue', { error: processError });
          // Don't throw here as the queue entry exists and will be processed later
        } else {
          logStep('Successfully triggered newsletter processing');
        }

      } catch (backgroundError) {
        logStep('Background task failed', { error: backgroundError });
        
        // ROLLBACK: Restore the generation count if background task fails
        try {
          const { error: rollbackError } = await supabase
            .from('profiles')
            .update({ 
              remaining_newsletter_generations: currentRemaining,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
            
          if (rollbackError) {
            logStep('Failed to rollback generation count', { error: rollbackError });
          } else {
            logStep('Successfully rolled back generation count');
          }
        } catch (rollbackError) {
          logStep('Rollback attempt failed', { error: rollbackError });
        }
      }
    };

    // Start background task using EdgeRuntime.waitUntil to ensure it completes
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundNewsletterGeneration());
    } else {
      // Fallback for environments without EdgeRuntime.waitUntil
      backgroundNewsletterGeneration().catch(error => {
        logStep('Background task failed (fallback)', { error });
      });
    }

    // Return immediate success response with updated count
    return new Response(JSON.stringify({
      success: true,
      message: "Newsletter generation started",
      remainingGenerations: newRemainingCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    logStep('Function error', { error: error.message });
    
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
