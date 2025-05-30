import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import XLoginButton from '@/components/auth/XLoginButton';
import XAuthButton from '@/components/auth/XAuthButton';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LogIn, UserPlus } from 'lucide-react';

const Auth = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    // Set active tab based on URL parameter
    const tabParam = searchParams.get('tab');
    if (tabParam === 'signup' || tabParam === 'login') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (authState.user && !authState.loading) {
      navigate('/dashboard/home');
    }
  }, [authState.user, authState.loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-grow bg-gradient-to-b from-white to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-center mb-8">
              <img 
                src="/thisone.png" 
                alt="Letternest Logo" 
                className="h-10 w-10 mr-2"
              />
              <h1 className="text-2xl font-bold">
                <span className="text-black">letter</span>
                <span className="text-[#0087C8]">nest</span>
              </h1>
            </div>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Letternest</h2>
              <p className="text-gray-600">Connect with your Twitter account to get started</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger 
                  value="login" 
                  className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-[#0087C8]"
                >
                  <LogIn size={16} />
                  Log In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
                >
                  <UserPlus size={16} />
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-gray-700">Log in to your existing account</p>
                </div>
                <XLoginButton />
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-gray-700">Create a new account</p>
                </div>
                <XAuthButton />
              </TabsContent>
            </Tabs>
            
            {authState.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {authState.error}
              </div>
            )}
          </div>
          
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              By continuing, you agree to Letternest's <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Auth;
