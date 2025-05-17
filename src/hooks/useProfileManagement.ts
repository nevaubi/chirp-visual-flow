
import { useState } from 'react';
import { Profile } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export const useProfileManagement = () => {
  // Function to update user profile
  const updateProfile = async (userId: string, updates: Partial<Profile>) => {
    if (!userId) {
      toast.error("Not authenticated");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        toast.error("Failed to update profile", {
          description: error.message,
        });
        return null;
      }

      toast.success("Profile updated successfully");
      return data as Profile;
    } catch (error) {
      const err = error as Error;
      toast.error("Error updating profile", {
        description: err.message,
      });
      return null;
    }
  };

  // Function to fetch a user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
          
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
        
      return data as Profile;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  return {
    updateProfile,
    fetchProfile
  };
};
