
import { useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { useProfileManagement } from '@/hooks/useProfileManagement';

export const useWelcomePopup = (userId: string | undefined) => {
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const { updateProfile } = useProfileManagement();

  // Handle welcome popup option selection
  const handleWelcomeOptionSelect = async (option: "newsletters" | "creator") => {
    if (!userId) return;
    
    try {
      const userPreference = option === "newsletters" ? "newsletters" : "creator";
      
      const updatedProfile = await updateProfile(userId, {
        is_new: false,
      });
      
      if (updatedProfile) {
        setShowWelcomePopup(false);
        
        toast.success(`Welcome to Chirpmetrics!`, {
          description: `You've selected the ${option === "newsletters" ? "Auto Newsletters" : "Creator Platform"} option.`,
        });
      }
    } catch (error) {
      console.error("Error in handleWelcomeOptionSelect:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  return {
    showWelcomePopup,
    setShowWelcomePopup,
    handleWelcomeOptionSelect
  };
};
