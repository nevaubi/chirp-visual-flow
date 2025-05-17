
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const XAuthButton = () => {
  const { signInWithTwitter } = useAuth();

  const handleSignUp = () => {
    signInWithTwitter();
  };

  return (
    <div className="flex justify-center items-center bg-gray-100 rounded-lg">
      <button 
        onClick={handleSignUp}
        className="flex items-center justify-center gap-3 px-6 py-3 bg-black text-white rounded-lg font-medium transition-all duration-300 hover:bg-gray-800 hover:shadow-lg hover:scale-105 hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-gray-400 w-64 relative overflow-hidden group"
      >
        <div className="absolute inset-0 w-0 bg-gradient-to-r from-gray-800 to-gray-700 transition-all duration-300 ease-out group-hover:w-full"></div>
        <div className="relative flex items-center justify-center gap-3">
          <span className="transform group-hover:rotate-12 transition-transform duration-300 inline-block">
            <XLogo />
          </span>
          <span>Sign up with X</span>
        </div>
      </button>
    </div>
  );
};

// X Logo Component
const XLogo = () => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="white" 
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
};

export default XAuthButton;
