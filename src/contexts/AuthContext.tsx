
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({ ...prev, loading: true }));
        
        if (event === 'SIGNED_IN' && session) {
          const profile = await fetchProfile(session.user.id);
          setAuthState({
            user: session.user,
            session,
            profile,
            loading: false,
            error: null,
          });
          
          // Redirect to dashboard if coming from auth page
          if (location.pathname === '/auth') {
            navigate('/dashboard/home');
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null,
          });
        } else if (session) {
          const profile = await fetchProfile(session.user.id);
          setAuthState({
            user: session.user,
            session,
            profile,
            loading: false,
            error: null,
          });
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
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
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
      } else {
        setAuthState({
          ...initialState,
          loading: false,
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
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
        error: err.message,
      }));
      toast.error('Authentication error', {
        description: err.message,
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error('Error signing out', {
          description: error.message,
        });
        return;
      }
      
      navigate('/');
      toast.success('Signed out successfully');
    } catch (error) {
      const err = error as Error;
      toast.error('Error signing out', {
        description: err.message,
      });
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
