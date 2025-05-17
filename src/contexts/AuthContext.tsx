
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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const navigate = useNavigate();
  const location = useLocation();

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
          } catch (error) {
            console.error('Error handling sign in:', error);
            setAuthState(prev => ({ ...prev, loading: false }));
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null,
          });
          
          // Redirect to home page if on a protected route
          if (location.pathname.includes('/dashboard')) {
            navigate('/', { replace: true });
          }
        } else if (session) {
          try {
            const profile = await fetchProfile(session.user.id);
            setAuthState({
              user: session.user,
              session,
              profile,
              loading: false,
              error: null,
            });
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
        } else {
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

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error('Error signing out', {
          description: error.message,
        });
        setAuthState(prev => ({ ...prev, loading: false }));
        return;
      }
      
      setAuthState({
        user: null,
        session: null,
        profile: null,
        loading: false,
        error: null,
      });
      
      navigate('/', { replace: true });
      toast.success('Signed out successfully');
    } catch (error) {
      const err = error as Error;
      toast.error('Error signing out', {
        description: err.message,
      });
      setAuthState(prev => ({ ...prev, loading: false }));
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
