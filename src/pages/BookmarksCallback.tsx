
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '@/integrations/twitterPkce';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const BookmarksCallback = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const finishAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem('twitter_pkce_state');
      sessionStorage.removeItem('twitter_pkce_state');

      if (!code || !state || state !== storedState) {
        toast({
          title: 'Authorization failed',
          description: 'Invalid state returned from Twitter',
          variant: 'destructive'
        });
        navigate('/dashboard/home', { replace: true });
        return;
      }

      try {
        if (!authState.user?.id) {
          throw new Error('User is not authenticated');
        }

        const tokenData = await exchangeCodeForToken(code, authState.user.id);
        
        sessionStorage.setItem('twitter_bookmarks_authorized', 'true');
        toast({ title: 'Bookmarks connected' });
      } catch (err) {
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
  }, [navigate, authState.user, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#0087C8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Processing authorization...</h2>
      </div>
    </div>
  );
};

export default BookmarksCallback;
