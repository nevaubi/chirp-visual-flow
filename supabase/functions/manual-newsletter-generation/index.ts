import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { selectedCount } = await req.json();
    
    // Validate tweet count input
    let validatedCount = 20; // Default value
    
    // Check if selectedCount is one of the valid options
    if (selectedCount === 10 || selectedCount === 20 || selectedCount === 30) {
      validatedCount = selectedCount;
    } else {
      console.warn(`Invalid tweet count provided: ${selectedCount}, using default 20`);
    }
    
    console.log(`Processing newsletter generation with ${validatedCount} tweets`);
    
    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get user ID from the JWT in authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token or user not found');
    }
    
    const userId = user.id;
    
    // Get user profile to check subscription and remaining generations
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, remaining_newsletter_generations')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      throw new Error('User profile not found');
    }
    
    // Check if user has required subscription tier
    const hasRequiredTier = 
      profile.subscription_tier === 'Newsletter Standard' || 
      profile.subscription_tier === 'Newsletter Premium';
    
    if (!hasRequiredTier) {
      throw new Error('Subscription required to generate newsletters');
    }
    
    // Check if user has remaining generations
    if (!profile.remaining_newsletter_generations || profile.remaining_newsletter_generations <= 0) {
      throw new Error('No remaining newsletter generations');
    }
    
    // Decrement the remaining generations count
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        remaining_newsletter_generations: profile.remaining_newsletter_generations - 1 
      })
      .eq('id', userId);
    
    if (updateError) {
      throw new Error(`Failed to update remaining generations: ${updateError.message}`);
    }
    
    // TODO: Implement actual newsletter generation logic using the selectedCount
    // This would include:
    // 1. Fetching the user's bookmarked tweets
    // 2. Processing them into a newsletter format
    // 3. Saving the newsletter to the database
    
    // For now, we'll just simulate success
    console.log(`Successfully generated newsletter for user ${userId} with ${validatedCount} tweets`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Newsletter generated with ${validatedCount} tweets`,
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('Error generating newsletter:', error);
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
