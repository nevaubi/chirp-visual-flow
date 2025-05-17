
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '@/integrations/twitterPkce';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const BookmarksCallback = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Verifying authentication...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('twitter_pkce_state');
    sessionStorage.removeItem('twitter_pkce_state');
    
    // Validate initial state and code parameters
    if (!code || !state || state !== storedState) {
      toast({
        title: 'Authorization failed',
        description: 'Invalid parameters returned from Twitter',
        variant: 'destructive'
      });
      navigate('/dashboard/home', { replace: true });
      return;
    }

    const finishAuth = async () => {
      try {
        // Check if we're still waiting for auth state to load
        if (authState.loading) {
          setStatusMessage('Waiting for authentication state...');
          return; // Will retry on next render when authState updates
        }
        
        // Check if user is authenticated
        if (!authState.user?.id) {
          // Try to get stored user ID from session storage as a fallback
          const storedUserId = sessionStorage.getItem('twitter_pkce_user_id');
          
          if (!storedUserId) {
            throw new Error('User is not authenticated and no stored user ID found');
          }
          
          console.log('Using stored user ID:', storedUserId);
          setStatusMessage('Finalizing authorization...');
          
          // Use the stored user ID
          const tokenData = await exchangeCodeForToken(code, storedUserId);
          sessionStorage.setItem('twitter_bookmarks_authorized', 'true');
          toast({ title: 'Bookmarks connected' });
        } else {
          console.log('User authenticated, proceeding with user ID:', authState.user.id);
          setStatusMessage('Finalizing authorization...');
          
          // Use the user ID from auth state
          const tokenData = await exchangeCodeForToken(code, authState.user.id);
          sessionStorage.setItem('twitter_bookmarks_authorized', 'true');
          toast({ title: 'Bookmarks connected' });
        }
      } catch (err) {
        console.error('BookmarksCallback error:', err);
        toast({
          title: 'Authorization error',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive'
        });
      } finally {
        navigate('/dashboard/home', { replace: true });
      }
    };

    finishAuth();
  }, [navigate, authState, toast]);

  // Add an effect to monitor auth state changes specifically
  useEffect(() => {
    console.log('Auth state updated:', {
      isLoading: authState.loading,
      isAuthenticated: !!authState.user,
      userId: authState.user?.id
    });
    
    // If auth state is no longer loading, trigger the finishAuth process again
    if (!authState.loading && isProcessing) {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        exchangeCodeForToken(code, authState.user?.id)
          .then(() => {
            sessionStorage.setItem('twitter_bookmarks_authorized', 'true');
            toast({ title: 'Bookmarks connected' });
            setIsProcessing(false);
            navigate('/dashboard/home', { replace: true });
          })
          .catch(err => {
            console.error('Error in auth state update effect:', err);
            toast({
              title: 'Authorization error',
              description: err instanceof Error ? err.message : 'Unknown error',
              variant: 'destructive'
            });
            setIsProcessing(false);
            navigate('/dashboard/home', { replace: true });
          });
      }
    }
  }, [authState.loading, authState.user, navigate, toast, isProcessing]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#0087C8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Processing authorization...</h2>
        <p className="text-gray-500 mt-2">{statusMessage}</p>
      </div>
    </div>
  );
};

export default BookmarksCallback;
