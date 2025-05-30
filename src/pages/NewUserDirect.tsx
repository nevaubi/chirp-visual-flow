
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import WelcomeAnimation from "@/components/auth/WelcomeAnimation";
import { Profile } from "@/types/auth";

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
          // Auto-select newsletter platform after animation starts
          handleAutoSelectNewsletter();
        }, 300);
      }
    }
  }, [authState.loading, authState.user, authState.profile, navigate]);

  // Automatically select newsletter platform
  const handleAutoSelectNewsletter = async () => {
    try {
      console.log("Auto-selecting newsletter platform for new user");
      
      // Prepare updates to mark user as newsletter platform user
      const updates: Partial<Profile> = {
        is_new: false,
        is_newsletter_platform: true,
        is_creator_platform: false,
      };
      
      // Update the profile
      await updateProfile(updates);
      
      console.log("Successfully auto-selected newsletter platform");
    } catch (error) {
      console.error("Error in handleAutoSelectNewsletter:", error);
      // Still redirect to dashboard even if there's an error
      setTimeout(() => {
        navigate('/dashboard/home', { replace: true });
      }, 2000);
    }
  };

  // Handle animation completion
  const handleAnimationComplete = () => {
    navigate('/dashboard/home', { replace: true });
  };
  
  return (
    <div className="min-h-screen">
      {showAnimation && (
        <WelcomeAnimation
          profilePicUrl={authState.profile?.twitter_profilepic_url}
          username={authState.profile?.twitter_username}
          onComplete={handleAnimationComplete}
        />
      )}
    </div>
  );
};

export default NewUserDirect;
