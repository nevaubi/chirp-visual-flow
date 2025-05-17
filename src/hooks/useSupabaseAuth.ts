
import { useState } from 'react';
import { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(false);

  const signInWithTwitter = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) {
        setLoading(false);
        toast.error('Failed to sign in with Twitter', {
          description: error.message,
        });
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      const err = error as AuthError;
      setLoading(false);
      
      toast.error('Authentication error', {
        description: err.message,
      });
      
      return { error: err };
    }
  };

  const signOut = async (force = false) => {
    try {
      console.log('Sign out initiated, force:', force);
      setLoading(true);
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('Sign out timeout triggered');
        if (force) {
          setLoading(false);
          toast.warning('Signed out locally due to timeout', {
            description: 'Server connection timed out, but you were signed out locally',
          });
          return { success: true, localOnly: true };
        } else {
          setLoading(false);
          toast.error('Sign out timeout', {
            description: 'Unable to contact authentication server. Please try again.',
          });
          return { success: false, error: 'Timeout' };
        }
      }, 5000);
      
      const { error } = await supabase.auth.signOut();
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error signing out:', error);
        
        if (force) {
          // Force sign out by clearing local state even though API call failed
          setLoading(false);
          toast.warning('Forced sign out completed', {
            description: 'Server error occurred, but you were signed out locally',
          });
          return { success: true, localOnly: true, error };
        } else {
          setLoading(false);
          toast.error('Error signing out', {
            description: error.message,
          });
          return { success: false, error };
        }
      }
      
      setLoading(false);
      toast.success('Signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('Exception in signOut:', error);
      const err = error as Error;
      
      if (force) {
        setLoading(false);
        toast.warning('Forced sign out completed', {
          description: 'An error occurred, but you were signed out locally',
        });
        return { success: true, localOnly: true, error: err };
      } else {
        setLoading(false);
        toast.error('Error signing out', {
          description: err.message,
        });
        return { success: false, error: err };
      }
    }
  };

  return {
    loading,
    signInWithTwitter,
    signOut
  };
};
