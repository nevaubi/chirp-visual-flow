
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
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}
