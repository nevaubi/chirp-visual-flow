
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { AuthState, Profile } from '@/types/auth';

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
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const navigate = useNavigate();
  const location = useLocation();

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
              
              // Redirect to dashboard if not already there
              if (!location.pathname.includes('/dashboard')) {
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
          if (location.pathname.includes('/dashboard')) {
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
            
            // Redirect to dashboard if on auth or root page
            if (location.pathname === '/' || location.pathname === '/auth') {
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
  }, [navigate, location.pathname]);

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
    <AuthContext.Provider value={{ authState, signInWithTwitter, signOut }}>
      {children}
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
