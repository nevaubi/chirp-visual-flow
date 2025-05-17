
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import WelcomePopup from "@/components/auth/WelcomePopup";

const NewUserDirect = () => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [showAnimation, setShowAnimation] = useState(false);
  
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
      } else {
        // Trigger animation after a short delay
        setTimeout(() => {
          setShowAnimation(true);
        }, 300);
      }
    }
  }, [authState.loading, authState.user, authState.profile, navigate]);

  // Handle welcome option selection
  const handleWelcomeOptionSelect = async (option: "newsletters" | "creator") => {
    try {
      // Prepare updates based on selected option
      const updates: Partial<Profile> = {
        is_new: false,
      };
      
      // Set the appropriate platform flag
      if (option === "newsletters") {
        updates.is_newsletter_platform = true;
        updates.is_creator_platform = false;
      } else {
        updates.is_creator_platform = true;
        updates.is_newsletter_platform = false;
      }
      
      // Update the profile
      await updateProfile(updates);
      
      // Wait for the animation and redirect
      setTimeout(() => {
        navigate('/dashboard/home', { replace: true });
      }, 1500);
    } catch (error) {
      console.error("Error in handleWelcomeOptionSelect:", error);
      // Redirect to dashboard even if there's an error
      navigate('/dashboard/home', { replace: true });
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <div 
        className={`transition-all duration-700 ease-in-out ${
          showAnimation ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <WelcomePopup 
          open={true} 
          onOptionSelect={handleWelcomeOptionSelect}
          disableClose={true}
          fullscreen={true}
        />
      </div>
    </div>
  );
};

export default NewUserDirect;
