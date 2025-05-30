
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting monthly limits reset...');

    // Reset tweet generations for Creator platform users
    const { data: updatedCreatorProfiles, error: updateCreatorError } = await supabaseAdmin
      .from('profiles')
      .update({
        remaining_tweet_generations: supabaseAdmin.raw(`
          CASE 
            WHEN is_creator_platform = true AND subscribed = true THEN 150
            WHEN is_creator_platform = true AND subscribed = false THEN 5
            ELSE remaining_tweet_generations
          END
        `)
      })
      .eq('is_creator_platform', true)
      .select('id, twitter_username, subscribed, remaining_tweet_generations');

    if (updateCreatorError) {
      console.error('Error updating Creator tweet generations:', updateCreatorError);
      throw new Error(`Failed to reset Creator tweet generations: ${updateCreatorError.message}`);
    }

    console.log(`Successfully reset tweet generations for ${updatedCreatorProfiles?.length || 0} Creator platform users`);

    // Reset newsletter generations for Newsletter platform users
    const { data: updatedNewsletterProfiles, error: updateNewsletterError } = await supabaseAdmin
      .from('profiles')
      .update({
        remaining_newsletter_generations: supabaseAdmin.raw(`
          CASE 
            WHEN is_newsletter_platform = true AND subscribed = true THEN 20
            WHEN is_newsletter_platform = true AND subscribed = false THEN 0
            ELSE remaining_newsletter_generations
          END
        `)
      })
      .eq('is_newsletter_platform', true)
      .select('id, twitter_username, subscribed, remaining_newsletter_generations');

    if (updateNewsletterError) {
      console.error('Error updating Newsletter generations:', updateNewsletterError);
      throw new Error(`Failed to reset Newsletter generations: ${updateNewsletterError.message}`);
    }

    console.log(`Successfully reset newsletter generations for ${updatedNewsletterProfiles?.length || 0} Newsletter platform users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset complete: ${updatedCreatorProfiles?.length || 0} Creator users, ${updatedNewsletterProfiles?.length || 0} Newsletter users`,
        creatorUsersUpdated: updatedCreatorProfiles?.length || 0,
        newsletterUsersUpdated: updatedNewsletterProfiles?.length || 0
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('Error in reset-monthly-limits function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unknown error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
