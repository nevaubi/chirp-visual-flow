
import { supabase } from '@/integrations/supabase/client';

export async function startPkceAuth(userId: string) {
  try {
    if (!userId) {
      throw new Error('User ID is required to start Twitter PKCE authentication');
    }
    
    // Store the user ID in session storage for later use
    sessionStorage.setItem('twitter_pkce_user_id', userId);
    
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

export async function exchangeCodeForToken(code: string, userId?: string) {
  const verifier = sessionStorage.getItem('twitter_pkce_verifier');
  sessionStorage.removeItem('twitter_pkce_verifier');
  
  // Get userId from params or from session storage
  const userIdToUse = userId || sessionStorage.getItem('twitter_pkce_user_id');
  sessionStorage.removeItem('twitter_pkce_user_id');
  
  if (!verifier) {
    throw new Error('Missing code verifier');
  }
  
  if (!userIdToUse) {
    throw new Error('User ID is missing. Unable to complete authentication flow.');
  }
  
  try {
    console.log('Exchanging code for token with user ID:', userIdToUse);
    
    // Call the edge function to exchange code for tokens and store them
    const { data, error } = await supabase.functions.invoke('exchange_twitter_code', {
      body: { code, verifier, userId: userIdToUse }
    });
    
    if (error) {
      console.error('Error from edge function:', error);
      throw new Error(`Error exchanging token: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}
