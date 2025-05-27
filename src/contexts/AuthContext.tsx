import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { AuthState, Profile } from '@/types/auth';
import WelcomePopup from '@/components/auth/WelcomePopup';

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
};

interface AuthContextProps {
  authState: AuthState;
  signInWithTwitter: () => Promise<void>;
  signOut: (force?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  checkSubscription: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>; // Modified to return the updated profile
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const navigate = useNavigate();

  // Helper function to clear auth state
  const clearAuthState = () => {
    setAuthState({
      user: null,
      session: null,
      profile: null,
      loading: false,
      error: null,
    });
  };

  // Function to refresh the user profile - now returns the updated profile
  const refreshProfile = async () => {
    if (!authState.user) {
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authState.user.id)
        .single();
        
      if (error) {
        console.error('Error refreshing profile:', error);
        return null;
      }
      
      const updatedProfile = data as Profile;
      
      setAuthState(prev => ({
        ...prev,
        profile: updatedProfile,
      }));
      
      return updatedProfile;
    } catch (error) {
      console.error('Error in refreshProfile:', error);
      return null;
    }
  };

  // Function to check subscription status
  const checkSubscription = async () => {
    if (!authState.user) {
      return;
    }
    
    try {
      console.log('Checking subscription status...');
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }
      
      console.log('Subscription check response:', data);
      
      if (data) {
        // Update profile with subscription details
        setAuthState(prev => {
          if (!prev.profile) return prev;
          
          return {
            ...prev,
            profile: {
              ...prev.profile,
              subscribed: data.subscribed,
              subscription_tier: data.subscription_tier,
              subscription_id: data.subscription_id,
              subscription_period_end: data.subscription_period_end,
              cancel_at_period_end: data.cancel_at_period_end,
              stripe_price_id: data.stripe_price_id,
            }
          };
        });
      }
    } catch (error) {
      console.error('Error in checkSubscription:', error);
    }
  };

  // Function to update user profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!authState.user) {
      toast.error("Not authenticated");
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authState.user.id);

      if (error) {
        toast.error("Failed to update profile", {
          description: error.message,
        });
        return;
      }

      // Update local state with the changes
      setAuthState(prev => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, ...updates } : null,
      }));

      // Only show success toast for certain updates, not automatic ones like timezone
      if (!('timezone' in updates && Object.keys(updates).length === 1)) {
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      const err = error as Error;
      toast.error("Error updating profile", {
        description: err.message,
      });
    }
  };

  // Handle welcome popup option selection
  const handleWelcomeOptionSelect = async (option: "newsletters" | "creator") => {
    try {
      // Prepare updates based on selected option
      const updates: Partial<Profile> = {
        is_new: false,
      };
      
      // Set the appropriate platform flag
      if (option === "newsletters") {
        updates.is_newsletter_platform = true;
        updates.is_creator_platform = false;
      } else {
        updates.is_creator_platform = true;
        updates.is_newsletter_platform = false;
      }
      
      // Update the profile
      await updateProfile(updates);
      
      // Close the welcome popup after a brief delay to allow the loading message to show
      setTimeout(() => {
        setShowWelcomePopup(false);
      }, 1500);
      
      // Refresh the current page to reflect the new platform selection
      setTimeout(() => {
        if (window.location.pathname.includes('/dashboard')) {
          // Force refresh the dashboard to load the right platform view
          navigate(0);
        }
      }, 2000);
    } catch (error) {
      console.error("Error in handleWelcomeOptionSelect:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
          return null;
        }
        
        // Don't automatically show welcome popup for new users
        // They will be directed to the newuser-direct page instead
        // if (data.is_new === null) {
        //   setShowWelcomePopup(true);
        // }
        
        return data as Profile;
      } catch (err) {
        console.error('Error in fetchProfile:', err);
        return null;
      }
    };

    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session) {
          try {
            // Use setTimeout to defer profile fetch and avoid potential race conditions
            setTimeout(async () => {
              const profile = await fetchProfile(session.user.id);
              setAuthState({
                user: session.user,
                session,
                profile,
                loading: false,
                error: null,
              });
              
              // Check subscription status after login
              setTimeout(() => {
                checkSubscription();
              }, 500);
              
              // Redirect to dashboard if not already there
              if (!window.location.pathname.includes('/dashboard')) {
                navigate('/dashboard/home', { replace: true });
              }
            }, 0);
          } catch (error) {
            console.error('Error handling sign in:', error);
            setAuthState(prev => ({ ...prev, loading: false }));
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthState();
          
          // Redirect to home page if on a protected route
          if (window.location.pathname.includes('/dashboard')) {
            navigate('/', { replace: true });
          }
        } else if (session) {
          try {
            // Use setTimeout to defer profile fetch and avoid potential race conditions
            setTimeout(async () => {
              const profile = await fetchProfile(session.user.id);
              setAuthState({
                user: session.user,
                session,
                profile,
                loading: false,
                error: null,
              });
              
              // Check subscription status whenever session changes
              setTimeout(() => {
                checkSubscription();
              }, 500);
            }, 0);
          } catch (error) {
            console.error('Error handling session update:', error);
            setAuthState(prev => ({ ...prev, loading: false }));
          }
        } else {
          setAuthState(prev => ({
            ...prev,
            loading: false,
          }));
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuthState({
            ...initialState,
            loading: false,
            error: error.message,
          });
          return;
        }
        
        if (data.session) {
          console.log('Session found during initialization:', data.session.user.id);
          setTimeout(async () => {
            const profile = await fetchProfile(data.session.user.id);
            setAuthState({
              user: data.session.user,
              session: data.session,
              profile,
              loading: false,
              error: null,
            });
            
            // Check subscription status on initialization
            setTimeout(() => {
              checkSubscription();
            }, 500);
            
            // Redirect to dashboard if on auth or root page
            if (window.location.pathname === '/' || window.location.pathname === '/auth') {
              navigate('/dashboard/home', { replace: true });
            }
          }, 0);
        } else {
          console.log('No session found during initialization');
          setAuthState({
            ...initialState,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        setAuthState({
          ...initialState,
          loading: false,
          error: 'Authentication initialization failed',
        });
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signInWithTwitter = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        toast.error('Failed to sign in with Twitter', {
          description: error.message,
        });
      }
    } catch (error) {
      const err = error as AuthError;
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
      toast.error('Authentication error', {
        description: err.message,
      });
    }
  };

  const signOut = async (force = false) => {
    try {
      console.log('Sign out initiated, force:', force);
      setAuthState(prev => ({ ...prev, loading: true }));
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('Sign out timeout triggered');
        if (force) {
          clearAuthState();
          navigate('/', { replace: true });
          toast.warning('Signed out locally due to timeout', {
            description: 'Server connection timed out, but you were signed out locally',
          });
        } else {
          setAuthState(prev => ({ ...prev, loading: false }));
          toast.error('Sign out timeout', {
            description: 'Unable to contact authentication server. Please try again.',
          });
        }
      }, 5000);
      
      const { error } = await supabase.auth.signOut();
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error signing out:', error);
        
        if (force) {
          // Force sign out by clearing local state even though API call failed
          clearAuthState();
          navigate('/', { replace: true });
          toast.warning('Forced sign out completed', {
            description: 'Server error occurred, but you were signed out locally',
          });
        } else {
          setAuthState(prev => ({ ...prev, loading: false }));
          toast.error('Error signing out', {
            description: error.message,
          });
        }
        return;
      }
      
      clearAuthState();
      navigate('/', { replace: true });
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Exception in signOut:', error);
      const err = error as Error;
      
      if (force) {
        clearAuthState();
        navigate('/', { replace: true });
        toast.warning('Forced sign out completed', {
          description: 'An error occurred, but you were signed out locally',
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
        toast.error('Error signing out', {
          description: err.message,
        });
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      authState, 
      signInWithTwitter, 
      signOut, 
      updateProfile, 
      checkSubscription,
      refreshProfile // Add refreshProfile to the context value
    }}>
      {children}
      
      {/* Render welcome popup when needed (for in-app settings changes) */}
      <WelcomePopup 
        open={showWelcomePopup} 
        onOptionSelect={handleWelcomeOptionSelect}
        profilePicUrl={authState.profile?.twitter_profilepic_url}
        username={authState.profile?.twitter_username}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
