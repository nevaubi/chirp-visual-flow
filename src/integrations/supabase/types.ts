export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      newsletter_queue: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          id: string
          is_newsletter_sent: Database["public"]["Enums"]["newsletter_status"]
          scheduled_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          is_newsletter_sent?: Database["public"]["Enums"]["newsletter_status"]
          scheduled_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          id?: string
          is_newsletter_sent?: Database["public"]["Enums"]["newsletter_status"]
          scheduled_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_storage: {
        Row: {
          created_at: string
          id: string
          markdown_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          markdown_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          markdown_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_creation_date: string | null
          bio: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          is_creator_platform: boolean | null
          is_new: boolean | null
          is_newsletter_platform: boolean | null
          is_verified: boolean | null
          location: string | null
          newsletter_content_preferences: Json | null
          newsletter_day_preference: string | null
          numerical_id: string | null
          remaining_newsletter_generations: number | null
          sending_email: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          subscribed: boolean
          subscription_id: string | null
          subscription_period_end: string | null
          subscription_tier: string | null
          timezone: string | null
          total_posts: number | null
          twitter_bookmark_access_token: string | null
          twitter_bookmark_refresh_token: string | null
          twitter_bookmark_token_expires_at: number | null
          twitter_handle: string | null
          twitter_profilepic_url: string | null
          twitter_username: string | null
          updated_at: string | null
          voice_profile_analysis: string | null
        }
        Insert: {
          account_creation_date?: string | null
          bio?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          id: string
          is_creator_platform?: boolean | null
          is_new?: boolean | null
          is_newsletter_platform?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          newsletter_content_preferences?: Json | null
          newsletter_day_preference?: string | null
          numerical_id?: string | null
          remaining_newsletter_generations?: number | null
          sending_email?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          subscribed?: boolean
          subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          total_posts?: number | null
          twitter_bookmark_access_token?: string | null
          twitter_bookmark_refresh_token?: string | null
          twitter_bookmark_token_expires_at?: number | null
          twitter_handle?: string | null
          twitter_profilepic_url?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          voice_profile_analysis?: string | null
        }
        Update: {
          account_creation_date?: string | null
          bio?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_creator_platform?: boolean | null
          is_new?: boolean | null
          is_newsletter_platform?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          newsletter_content_preferences?: Json | null
          newsletter_day_preference?: string | null
          numerical_id?: string | null
          remaining_newsletter_generations?: number | null
          sending_email?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          subscribed?: boolean
          subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          total_posts?: number | null
          twitter_bookmark_access_token?: string | null
          twitter_bookmark_refresh_token?: string | null
          twitter_bookmark_token_expires_at?: number | null
          twitter_handle?: string | null
          twitter_profilepic_url?: string | null
          twitter_username?: string | null
          updated_at?: string | null
          voice_profile_analysis?: string | null
        }
        Relationships: []
      }
      tickerdrop_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_email_verified: boolean
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
          verification_token: string | null
          verification_token_expires_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_email_verified?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          verification_token?: string | null
          verification_token_expires_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_email_verified?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          verification_token?: string | null
          verification_token_expires_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      newsletter_status: "false" | "pending" | "true"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      newsletter_status: ["false", "pending", "true"],
    },
  },
} as const
