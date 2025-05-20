
import { supabase } from '../supabase/client';

// Define the interface for newsletter data
export interface NewsletterData {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  success: boolean;
}

// Function to store a newsletter in Redis
export async function storeNewsletter(data: NewsletterData): Promise<boolean> {
  try {
    // Store the newsletter data
    const { error: storeError } = await supabase.functions.invoke('redis-store-newsletter', {
      body: { data }
    });
    
    if (storeError) {
      console.error('Error storing newsletter:', storeError);
      return false;
    }
    
    // Add the ID to the user's list of newsletters
    const { error: indexError } = await supabase.functions.invoke('redis-add-to-index', {
      body: { 
        userId: data.userId,
        newsletterId: data.id
      }
    });
    
    if (indexError) {
      console.error('Error updating newsletter index:', indexError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in storeNewsletter:', error);
    return false;
  }
}

// Function to get a user's newsletters
export async function getUserNewsletters(userId: string): Promise<NewsletterData[]> {
  try {
    const { data, error } = await supabase.functions.invoke('redis-get-user-newsletters', {
      body: { userId }
    });
    
    if (error) {
      console.error('Error fetching newsletters:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserNewsletters:', error);
    return [];
  }
}

// Function to get a specific newsletter
export async function getNewsletter(userId: string, newsletterId: string): Promise<NewsletterData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('redis-get-newsletter', {
      body: { 
        userId,
        newsletterId
      }
    });
    
    if (error) {
      console.error('Error fetching newsletter:', error);
      return null;
    }
    
    return data || null;
  } catch (error) {
    console.error('Error in getNewsletter:', error);
    return null;
  }
}
