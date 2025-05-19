
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  console.log('[CLEANUP-NEWSLETTER-QUEUE] Function started');
  
  // Create Supabase client with service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Get current date at the start of the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Delete all queue items scheduled for today or earlier
    const { error: deleteError, count } = await supabase
      .from('newsletter_queue')
      .delete({ count: 'exact' })
      .lte('scheduled_date', today.toISOString());
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log(`[CLEANUP-NEWSLETTER-QUEUE] Deleted ${count} queue items`);
    
    return new Response(JSON.stringify({ 
      message: `Successfully cleaned up ${count} queue items` 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('[CLEANUP-NEWSLETTER-QUEUE] ERROR -', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
