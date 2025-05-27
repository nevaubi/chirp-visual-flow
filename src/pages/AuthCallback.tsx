
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback page loaded');
        
        // Set a timeout to prevent users from being stuck on this page
        const timeoutId = setTimeout(() => {
          console.log('Auth callback timeout triggered');
          toast.error('Authentication timeout', {
            description: 'The authentication process took too long. Please try again.',
          });
          navigate('/auth', { replace: true });
        }, 10000);
        
        const { data, error } = await supabase.auth.getSession();
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        if (error) {
          console.error('Authentication error:', error);
          toast.error('Authentication error', {
            description: error.message,
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session) {
          console.log('Successfully authenticated with session:', data.session.user.id);
          toast.success('Successfully authenticated');
          
          // Check if this is a new user by fetching their profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_new')
            .eq('id', data.session.user.id)
            .single();
            
          if (!profileError && profileData && profileData.is_new === null) {
            // This is a new user, redirect to the new user flow
            console.log('New user detected, redirecting to onboarding');
            navigate('/newuser-direct', { replace: true });
          } else {
            // Regular user, redirect to dashboard
            navigate('/dashboard/home', { replace: true });
          }
        } else {
          console.log('No session found, redirecting to auth');
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error('Error in handleAuthCallback:', error);
        toast.error('Authentication failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#0087C8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Completing authentication...</h2>
        <p className="text-gray-500 mt-2">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
