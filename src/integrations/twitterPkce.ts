
import { supabase } from '@/integrations/supabase/client';

// Remove environment variables as they'll be handled by edge functions
// Instead, provide client-side methods to work with the edge functions

export async function startPkceAuth() {
  try {
    // Call the edge function to get auth URL and verifier
    const { data, error } = await supabase.functions.invoke('start_twitter_pkce');
    
    if (error) {
      throw new Error(`Error starting Twitter PKCE: ${error.message}`);
    }
    
    if (!data || !data.authUrl || !data.verifier || !data.state) {
      throw new Error('Invalid response from authentication service');
    }
    
    // Store verifier and state in session storage for later use
    sessionStorage.setItem('twitter_pkce_verifier', data.verifier);
    sessionStorage.setItem('twitter_pkce_state', data.state);
    
    // Redirect to Twitter authorization page
    window.location.href = data.authUrl;
  } catch (error) {
    console.error('Error initiating Twitter auth:', error);
    throw error;
  }
}

export async function exchangeCodeForToken(code: string, userId: string, timezone?: string) {
  const verifier = sessionStorage.getItem('twitter_pkce_verifier');
  sessionStorage.removeItem('twitter_pkce_verifier');
  
  if (!verifier) {
    throw new Error('Missing code verifier');
  }
  
  try {
    console.log('Sending to edge function with timezone:', timezone);
    // Call the edge function to exchange code for tokens and store them
    const { data, error } = await supabase.functions.invoke('exchange_twitter_code', {
      body: { code, verifier, userId, timezone }
    });
    
    if (error) {
      throw new Error(`Error exchanging token: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}
