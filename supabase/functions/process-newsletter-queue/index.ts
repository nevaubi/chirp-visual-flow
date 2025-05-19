import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Max attempts before giving up on a newsletter
const MAX_ATTEMPTS = 3;

serve(async (req) => {
  console.log('[PROCESS-NEWSLETTER-QUEUE] Function started');
  
  // Create Supabase client with service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Get the next newsletter to process (with status 'false')
    const { data: nextNewsletter, error: fetchError } = await supabase
      .from('newsletter_queue')
      .select('*')
      .eq('is_newsletter_sent', 'false')
      .lt('attempt_count', MAX_ATTEMPTS)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .single();
    
    if (fetchError) {
      // If no newsletters are found, this is not an error
      if (fetchError.code === 'PGRST116') {
        return new Response(JSON.stringify({ 
          message: 'No newsletters to process' 
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }
      throw fetchError;
    }
    
    console.log(`[PROCESS-NEWSLETTER-QUEUE] Processing newsletter for user: ${nextNewsletter.user_id}`);
    
    // Update status to 'pending' and increment attempt count
    const { error: updateError } = await supabase
      .from('newsletter_queue')
      .update({ 
        is_newsletter_sent: 'pending',
        attempt_count: nextNewsletter.attempt_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', nextNewsletter.id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Get user profile for newsletter generation
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', nextNewsletter.user_id)
      .single();
    
    if (profileError) {
      throw profileError;
    }
    
    // TODO: Implement the actual newsletter generation logic here
    // This is a placeholder for your actual newsletter generation code
    console.log(`[PROCESS-NEWSLETTER-QUEUE] Generating newsletter for user: ${userProfile.twitter_handle || userProfile.id}`);
    
    // Simulate newsletter generation (replace with actual implementation)
    const newsletterGenerated = true;
    
    // Update the queue item based on the result
    if (newsletterGenerated) {
      // Success - update status to 'true'
      const { error: successError } = await supabase
        .from('newsletter_queue')
        .update({ 
          is_newsletter_sent: 'true',
          updated_at: new Date().toISOString()
        })
        .eq('id', nextNewsletter.id);
      
      if (successError) {
        throw successError;
      }
    } else {
      // Failed - update error message and keep status as 'false' for retry
      const { error: failureError } = await supabase
        .from('newsletter_queue')
        .update({ 
          is_newsletter_sent: 'false',
          error_message: 'Failed to generate newsletter',
          updated_at: new Date().toISOString()
        })
        .eq('id', nextNewsletter.id);
      
      if (failureError) {
        throw failureError;
      }
    }
    
    return new Response(JSON.stringify({ 
      message: `Newsletter processed for user: ${nextNewsletter.user_id}`,
      success: newsletterGenerated
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('[PROCESS-NEWSLETTER-QUEUE] ERROR -', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
