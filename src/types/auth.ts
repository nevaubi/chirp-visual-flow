
import { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  twitter_username: string | null;
  twitter_handle: string | null;
  twitter_profilepic_url: string | null;
  follower_count: number | null;
  following_count: number | null;
  is_verified: boolean;
  bio: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
  is_new: boolean | null;
  is_newsletter_platform: boolean | null;
  is_creator_platform: boolean | null;
  numerical_id: string | null;
  account_creation_date: string | null;
  total_posts: number | null;
  location: string | null;
  twitter_bookmark_access_token: string | null;
  twitter_bookmark_refresh_token: string | null;
  twitter_bookmark_token_expires_at: number | null;
  // Stripe subscription fields
  stripe_customer_id: string | null;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_id: string | null;
  subscription_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_price_id: string | null;
  // Email field
  sending_email: string | null;
  // Newsletter preference fields
  newsletter_day_preference: string | null;
  newsletter_content_preferences: {
    audience?: string;
    frequency?: string;
    content_approach?: string;
    writing_style?: string;
    include_media?: string;
    add_signature?: string;
    newsletter_name?: string;
    template?: string;
  } | null;
  // Newsletter generation tracking
  remaining_newsletter_generations: number | null;
  // Voice profile and tweet dataset
  voice_profile_analysis: string | null;
  personal_tweet_dataset: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}
