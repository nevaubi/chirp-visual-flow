
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  console.log('[POPULATE-NEWSLETTER-QUEUE] Function started');
  
  // Create Supabase client with service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Get current date at the start of the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find all users who need newsletters today
    // This is a placeholder query - you'll need to adjust it based on your actual scheduling logic
    const { data: usersNeedingNewsletters, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('subscribed', true);
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`[POPULATE-NEWSLETTER-QUEUE] Found ${usersNeedingNewsletters?.length || 0} users for newsletters`);
    
    // Skip if no users need newsletters today
    if (!usersNeedingNewsletters || usersNeedingNewsletters.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No users need newsletters today' 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Add users to the newsletter queue
    const queueItems = usersNeedingNewsletters.map(user => ({
      user_id: user.id,
      scheduled_date: today.toISOString(),
      is_newsletter_sent: 'false',
      attempt_count: 0
    }));
    
    // Batch insert users into the queue table
    const { error: insertError } = await supabase
      .from('newsletter_queue')
      .upsert(queueItems, { 
        onConflict: 'user_id,scheduled_date',
        ignoreDuplicates: true 
      });
    
    if (insertError) {
      throw insertError;
    }
    
    return new Response(JSON.stringify({ 
      message: `Successfully queued ${queueItems.length} newsletters` 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('[POPULATE-NEWSLETTER-QUEUE] ERROR -', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
