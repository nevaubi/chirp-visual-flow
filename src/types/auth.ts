
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
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}
