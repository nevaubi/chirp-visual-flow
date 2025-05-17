
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthState, Profile } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import WelcomePopup from '@/components/auth/WelcomePopup';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useProfileManagement } from '@/hooks/useProfileManagement';
import { useWelcomePopup } from '@/hooks/useWelcomePopup';

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
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const navigate = useNavigate();
  const { loading: authLoading, signInWithTwitter: supabaseSignIn, signOut: supabaseSignOut } = useSupabaseAuth();
  const { fetchProfile, updateProfile: updateUserProfile } = useProfileManagement();
  const { 
    showWelcomePopup, 
    setShowWelcomePopup, 
    handleWelcomeOptionSelect 
  } = useWelcomePopup(authState.user?.id);

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

  // Function to update user profile wrapper
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!authState.user) {
      return;
    }

    setAuthState(prev => ({ ...prev, loading: true }));
    
    const updatedProfile = await updateUserProfile(authState.user.id, updates);
    
    if (updatedProfile) {
      // Update local state with the changes
      setAuthState(prev => ({
        ...prev,
        profile: updatedProfile,
        loading: false,
      }));
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  // Wrapper for sign in function
  const signInWithTwitter = async () => {
    setAuthState(prev => ({ ...prev, loading: true }));
    await supabaseSignIn();
  };

  // Wrapper for sign out function
  const signOut = async (force = false) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    const result = await supabaseSignOut(force);
    
    if (result.success) {
      clearAuthState();
      navigate('/', { replace: true });
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
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
              
              // Check if user is new and trigger welcome popup if needed
              if (profile?.is_new === null) {
                setShowWelcomePopup(true);
              }
              
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
            
            // Check if user is new and trigger welcome popup if needed
            if (profile?.is_new === null) {
              setShowWelcomePopup(true);
            }
            
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

  return (
    <AuthContext.Provider value={{ authState, signInWithTwitter, signOut, updateProfile }}>
      {children}
      
      {/* Render welcome popup when needed */}
      <WelcomePopup 
        open={showWelcomePopup} 
        onOptionSelect={handleWelcomeOptionSelect}
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
