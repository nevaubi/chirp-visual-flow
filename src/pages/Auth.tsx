
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import XAuthButton from '@/components/auth/XAuthButton';
import XLoginButton from '@/components/auth/XLoginButton';

const Auth = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (authState.user && !authState.loading) {
      navigate('/dashboard/home');
    }
  }, [authState.user, authState.loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
              alt="Chirpmetrics Logo" 
              className="h-10 w-10 mr-2"
            />
            <h1 className="text-2xl font-bold text-[#0087C8]">chirpmetrics</h1>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Chirpmetrics</h2>
            <p className="text-gray-600">Connect with your Twitter account to get started</p>
          </div>
          
          <div className="space-y-4">
            <XLoginButton />
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-gray-300 absolute w-full"></div>
              <span className="bg-white px-4 text-sm text-gray-500 relative">or</span>
            </div>
            <XAuthButton />
          </div>
          
          {authState.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {authState.error}
            </div>
          )}
        </div>
        
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            By continuing, you agree to Chirpmetrics' <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
