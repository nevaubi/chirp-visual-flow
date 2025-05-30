
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types/auth";

const NewUserDirect = () => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if user is actually new, redirect otherwise
  useEffect(() => {
    if (!authState.loading) {
      if (!authState.user) {
        navigate('/auth', { replace: true });
        return;
      }
      
      if (authState.profile && authState.profile.is_new === false) {
        // User is not new, redirect to dashboard
        navigate('/dashboard/home', { replace: true });
      } else if (authState.profile && authState.profile.is_new === true) {
        // Automatically set user to newsletter platform
        handleAutoSetup();
      }
    }
  }, [authState.loading, authState.user, authState.profile, navigate]);

  // Automatically set up user for newsletter platform
  const handleAutoSetup = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Set user to newsletter platform automatically
      const updates: Partial<Profile> = {
        is_new: false,
        is_newsletter_platform: true,
        is_creator_platform: false,
      };
      
      // Update the profile
      await updateProfile(updates);
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard/home', { replace: true });
      }, 1000);
    } catch (error) {
      console.error("Error in handleAutoSetup:", error);
      // Redirect to dashboard even if there's an error
      navigate('/dashboard/home', { replace: true });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-t-transparent border-[#0087C8] rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Setting up your account...</h3>
        <p className="text-gray-600">Taking you to the Newsletter platform.</p>
      </div>
    </div>
  );
};

export default NewUserDirect;
