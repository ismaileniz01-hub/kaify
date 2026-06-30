/**
 * Supabase database types — hand-authored to match supabase/migrations.
 *
 * Keep this in sync with the SQL migrations. When the Supabase CLI is linked,
 * you may regenerate with:
 *   npx supabase gen types typescript --project-id <project-id> > lib/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OnboardingStatus = "PAID" | "FORMS_COMPLETED" | "ACTIVE";
export type SubscriptionTier = "essential" | "pro" | "premium_max";
export type GemTransactionType =
  | "welcome_bonus"
  | "daily_check_in"
  | "chat_message"
  | "workout_complete"
  | "streak_milestone"
  | "weekly_goal"
  | "trophy_unlock"
  | "market_purchase"
  | "referral_bonus"
  | "admin_adjustment";

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience_level: string | null;
  is_natural: boolean;
  bio: string | null;
  country_code: string;
  locale: string;
  onboarding_status: OnboardingStatus;
  tier: SubscriptionTier;
  tier_started_at: string | null;
  tier_expires_at: string | null;
  referral_code: string;
  referred_by_code: string | null;
  team_chat_unlocked: boolean;
  team_chat_unlocked_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileInsert = {
  id: string;
  referral_code: string;
  display_name?: string;
  avatar_url?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  experience_level?: string | null;
  is_natural?: boolean;
  bio?: string | null;
  country_code?: string;
  locale?: string;
  onboarding_status?: OnboardingStatus;
  tier?: SubscriptionTier;
  tier_started_at?: string | null;
  tier_expires_at?: string | null;
  referred_by_code?: string | null;
  team_chat_unlocked?: boolean;
  team_chat_unlocked_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProfileUpdate = {
  display_name?: string;
  avatar_url?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  experience_level?: string | null;
  is_natural?: boolean;
  bio?: string | null;
  country_code?: string;
  locale?: string;
  onboarding_status?: OnboardingStatus;
  tier?: SubscriptionTier;
  tier_started_at?: string | null;
  tier_expires_at?: string | null;
  referred_by_code?: string | null;
  team_chat_unlocked?: boolean;
  team_chat_unlocked_at?: string | null;
  updated_at?: string;
};

type GemLedgerRow = {
  id: string;
  user_id: string;
  amount: number;
  type: GemTransactionType;
  description: string;
  idempotency_key: string;
  metadata: Json | null;
  created_at: string;
};

type GemLedgerInsert = {
  id?: string;
  user_id: string;
  amount: number;
  type: GemTransactionType;
  description: string;
  idempotency_key: string;
  metadata?: Json | null;
  created_at?: string;
};

type GemBalanceRow = {
  user_id: string | null;
  balance: number | null;
  total_earned: number | null;
  total_spent: number | null;
};

type UserStreakRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_check_in_date: string | null;
  freezie_balance: number;
  updated_at: string;
};

type UserKaiStateRow = {
  user_id: string;
  unlocked_level: number;
  active_aura: string;
  updated_at: string;
};

type CompleteOnboardingArgs = {
  p_display_name: string;
  p_gender: string;
  p_height_cm: number;
  p_weight_kg: number;
  p_experience_level: string;
  p_is_natural: boolean;
  p_bio: string;
  p_locale: string;
};

export type CheckInResult = {
  already_checked_in: boolean;
  current_streak: number;
  longest_streak: number;
  freezie_balance: number;
  freezie_awarded: boolean;
  streak_dropped: boolean;
  streak_protected: boolean;
  gems_awarded: number;
  gem_balance: number;
  kai_unlocked_level: number;
  kai_level_up: boolean;
  checked_in_date: string;
};

export type GemMutationResult = {
  applied: boolean;
  duplicate: boolean;
  amount: number;
  balance: number;
  idempotency_key: string;
};

type GemMutationArgs = {
  p_user_id: string;
  p_amount: number;
  p_type: GemTransactionType;
  p_description: string;
  p_idempotency_key: string;
  p_metadata?: Json | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      gem_ledger: {
        Row: GemLedgerRow;
        Insert: GemLedgerInsert;
        Update: Partial<GemLedgerInsert>;
        Relationships: [];
      };
      user_streaks: {
        Row: UserStreakRow;
        Insert: { user_id: string } & Partial<Omit<UserStreakRow, "user_id">>;
        Update: Partial<UserStreakRow>;
        Relationships: [];
      };
      user_kai_state: {
        Row: UserKaiStateRow;
        Insert: { user_id: string } & Partial<Omit<UserKaiStateRow, "user_id">>;
        Update: Partial<UserKaiStateRow>;
        Relationships: [];
      };
    };
    Views: {
      user_gem_balances: {
        Row: GemBalanceRow;
        Relationships: [];
      };
    };
    Functions: {
      complete_onboarding: {
        Args: CompleteOnboardingArgs;
        Returns: ProfileRow;
      };
      activate_user: {
        Args: Record<string, never>;
        Returns: ProfileRow;
      };
      perform_daily_check_in: {
        Args: { p_request_key?: string | null };
        Returns: CheckInResult;
      };
      earn_gems: {
        Args: GemMutationArgs;
        Returns: GemMutationResult;
      };
      spend_gems: {
        Args: GemMutationArgs;
        Returns: GemMutationResult;
      };
    };
    Enums: {
      onboarding_status: OnboardingStatus;
      subscription_tier: SubscriptionTier;
      gem_transaction_type: GemTransactionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
