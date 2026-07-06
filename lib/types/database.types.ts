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
export type UsageResource = "text_tokens" | "maya_photo" | "leo_photo";
export type WarningTrigger = "LIMIT_80" | "LIMIT_100";
export type BillingCycle = "monthly" | "yearly";
export type MessageSender = "user" | "coach" | "system";
export type MessageType =
  | "text"
  | "analysis"
  | "score"
  | "meal_plan"
  | "workout_plan"
  | "daily_summary"
  | "photo_analysis"
  | "team_meeting";
export type CoachId = "alex" | "maya" | "leo" | "kai";
export type ThreadType = "direct" | "team";
export type ProfileRole = "user" | "admin";
export type NotificationType =
  | "streak_risk"
  | "streak_milestone"
  | "kai_level_up"
  | "freezie_earned"
  | "badge"
  | "weekly_summary"
  | "water_reminder"
  | "praise"
  | "system";
export type GemTransactionType =
  | "welcome_bonus"
  | "daily_check_in"
  | "daily_chest"
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
  role: ProfileRole;
  display_name: string;
  avatar_url: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience_level: string | null;
  is_natural: boolean;
  bio: string | null;
  country_code: string;
  city_name: string | null;
  locale: string;
  timezone: string;
  timezone_updated_at: string;
  onboarding_status: OnboardingStatus;
  tier: SubscriptionTier;
  billing_cycle: BillingCycle;
  tier_started_at: string | null;
  tier_expires_at: string | null;
  referral_code: string;
  referred_by_code: string | null;
  team_chat_unlocked: boolean;
  team_chat_unlocked_at: string | null;
  leaderboard_opt_out: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileInsert = {
  id: string;
  referral_code: string;
  role?: ProfileRole;
  display_name?: string;
  avatar_url?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  experience_level?: string | null;
  is_natural?: boolean;
  bio?: string | null;
  country_code?: string;
  city_name?: string | null;
  locale?: string;
  timezone?: string;
  timezone_updated_at?: string;
  onboarding_status?: OnboardingStatus;
  tier?: SubscriptionTier;
  billing_cycle?: BillingCycle;
  tier_started_at?: string | null;
  tier_expires_at?: string | null;
  referred_by_code?: string | null;
  team_chat_unlocked?: boolean;
  team_chat_unlocked_at?: string | null;
  leaderboard_opt_out?: boolean;
  created_at?: string;
  updated_at?: string;
};

type ProfileUpdate = {
  role?: ProfileRole;
  display_name?: string;
  avatar_url?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  experience_level?: string | null;
  is_natural?: boolean;
  bio?: string | null;
  country_code?: string;
  city_name?: string | null;
  locale?: string;
  timezone?: string;
  timezone_updated_at?: string;
  onboarding_status?: OnboardingStatus;
  tier?: SubscriptionTier;
  billing_cycle?: BillingCycle;
  tier_started_at?: string | null;
  tier_expires_at?: string | null;
  referred_by_code?: string | null;
  team_chat_unlocked?: boolean;
  team_chat_unlocked_at?: string | null;
  leaderboard_opt_out?: boolean;
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

type TierLimitsRow = {
  tier: SubscriptionTier;
  monthly_text_tokens: number;
  maya_photos_daily: number;
  leo_photos_weekly: number;
};

type UserUsageCounterRow = {
  user_id: string;
  text_tokens_used: number;
  text_period_start: string;
  maya_photos_used: number;
  maya_period_date: string;
  leo_photos_used: number;
  leo_week_start: string;
  updated_at: string;
};

type UsageEventRow = {
  id: string;
  user_id: string;
  resource: UsageResource;
  event_type: string;
  usage_percent: number | null;
  used: number | null;
  limit_value: number | null;
  metadata: Json | null;
  created_at: string;
};

type AiProvider = "deepseek" | "gemini";

type AiUsageLedgerRow = {
  id: string;
  user_id: string | null;
  provider: AiProvider;
  operation: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_usd_micro: number;
  metadata: Json | null;
  created_at: string;
};

type CostAlertRow = {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  metadata: Json | null;
  acknowledged: boolean;
  created_at: string;
};

export type UsageCheckResult = {
  allowed: boolean;
  warning_trigger: WarningTrigger | null;
  resource: UsageResource;
  tier: SubscriptionTier;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
};

export type UsageNode = {
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  warning: WarningTrigger | null;
};

export type UsageStatusResult = {
  tier: SubscriptionTier;
  text_tokens: UsageNode;
  maya_photo: UsageNode;
  leo_photo: UsageNode;
};

type CoachRow = {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatar_url: string;
  theme: Json;
  supports_vision: boolean;
  ai_model: string;
  vision_model: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  user_id: string;
  coach_id: string | null;
  thread_type: ThreadType;
  sender: MessageSender;
  message_type: MessageType;
  content: string | null;
  payload: Json | null;
  tokens_used: number;
  locale: string;
  created_at: string;
};

type ChatMessageInsert = {
  id?: string;
  user_id: string;
  coach_id?: string | null;
  thread_type?: ThreadType;
  sender: MessageSender;
  message_type?: MessageType;
  content?: string | null;
  payload?: Json | null;
  tokens_used?: number;
  locale?: string;
  created_at?: string;
};

type UserCoachingStateRow = {
  user_id: string;
  motivation_style: string | null;
  training_focus: string[];
  nutrition_prefs: Json | null;
  injury_notes: string | null;
  posture_flags: Json | null;
  last_workout_summary: string | null;
  weekly_goals: Json | null;
  deepseek_cache_key: string | null;
  message_count_since_condense: number;
  updated_at: string;
};

type CoachingMemoryRow = {
  id: string;
  user_id: string;
  coach_id: string | null;
  summary: string;
  key_facts: Json;
  source_range: Json | null;
  token_saved: number | null;
  created_at: string;
};

type CoachingMemoryInsert = {
  id?: string;
  user_id: string;
  coach_id?: string | null;
  summary: string;
  key_facts?: Json;
  source_range?: Json | null;
  token_saved?: number | null;
  created_at?: string;
};

type ApplySubscriptionArgs = {
  p_user_id: string;
  p_tier: SubscriptionTier;
  p_billing_cycle: BillingCycle;
};

type ReferralRow = {
  id: string;
  referrer_id: string;
  referred_id: string;
  code: string;
  discount_applied: boolean;
  created_at: string;
};

type ReferralEventRow = {
  id: string;
  referral_id: string | null;
  referrer_id: string;
  referred_id: string;
  event_type: string;
  metadata: Json | null;
  created_at: string;
};

export type ProcessReferralResult = {
  applied: boolean;
  duplicate: boolean;
  referrer_id: string;
  referral_id?: string;
  discount_applied?: boolean;
  bonus?: number;
};

export type GlobalLeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  country_code: string;
  current_streak: number;
  longest_streak: number;
};

export type CountryLeaderboardEntry = {
  rank: number;
  country_code: string;
  total_streak: number;
  user_count: number;
  avg_streak: number;
};

export type UserRankResult = {
  rank: number | null;
  current_streak: number;
  total_ranked: number;
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
      tier_limits: {
        Row: TierLimitsRow;
        Insert: TierLimitsRow;
        Update: Partial<TierLimitsRow>;
        Relationships: [];
      };
      user_usage_counters: {
        Row: UserUsageCounterRow;
        Insert: { user_id: string } & Partial<Omit<UserUsageCounterRow, "user_id">>;
        Update: Partial<UserUsageCounterRow>;
        Relationships: [];
      };
      usage_events: {
        Row: UsageEventRow;
        Insert: { user_id: string } & Partial<Omit<UsageEventRow, "id" | "user_id">>;
        Update: Partial<UsageEventRow>;
        Relationships: [];
      };
      ai_usage_ledger: {
        Row: AiUsageLedgerRow;
        Insert: {
          provider: AiProvider;
          operation: string;
        } & Partial<Omit<AiUsageLedgerRow, "id" | "provider" | "operation">>;
        Update: Partial<AiUsageLedgerRow>;
        Relationships: [];
      };
      cost_alerts: {
        Row: CostAlertRow;
        Insert: {
          alert_type: string;
          message: string;
        } & Partial<Omit<CostAlertRow, "id" | "alert_type" | "message">>;
        Update: Partial<CostAlertRow>;
        Relationships: [];
      };
      coaches: {
        Row: CoachRow;
        Insert: CoachRow;
        Update: Partial<CoachRow>;
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessageRow;
        Insert: ChatMessageInsert;
        Update: Partial<ChatMessageInsert>;
        Relationships: [];
      };
      user_coaching_state: {
        Row: UserCoachingStateRow;
        Insert: { user_id: string } & Partial<Omit<UserCoachingStateRow, "user_id">>;
        Update: Partial<UserCoachingStateRow>;
        Relationships: [];
      };
      coaching_memory: {
        Row: CoachingMemoryRow;
        Insert: CoachingMemoryInsert;
        Update: Partial<CoachingMemoryInsert>;
        Relationships: [];
      };
      referrals: {
        Row: ReferralRow;
        Insert: { referrer_id: string; referred_id: string; code: string } & Partial<
          Omit<ReferralRow, "referrer_id" | "referred_id" | "code">
        >;
        Update: Partial<ReferralRow>;
        Relationships: [];
      };
      referral_events: {
        Row: ReferralEventRow;
        Insert: {
          referrer_id: string;
          referred_id: string;
          event_type: string;
        } & Partial<Omit<ReferralEventRow, "referrer_id" | "referred_id" | "event_type">>;
        Update: Partial<ReferralEventRow>;
        Relationships: [];
      };
      analytics_daily: {
        Row: {
          user_id: string;
          entry_date: string;
          weight_kg: number | null;
          calories_consumed: number;
          calories_burned: number;
          calorie_goal: number;
          workouts_completed: number;
          workouts_target: number;
          water_liters: number;
          water_goal_liters: number;
          steps: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          protein_goal_g: number;
          carbs_goal_g: number;
          fat_goal_g: number;
          updated_at: string;
        };
        Insert: { user_id: string; entry_date?: string } & Partial<
          Omit<Database["public"]["Tables"]["analytics_daily"]["Row"], "user_id" | "entry_date">
        >;
        Update: Partial<Database["public"]["Tables"]["analytics_daily"]["Row"]>;
        Relationships: [];
      };
      health_steps: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          steps: number;
          source: string;
          synced_at: string;
        };
        Insert: {
          user_id: string;
          entry_date: string;
          steps: number;
          source?: string;
          synced_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["health_steps"]["Row"]>;
        Relationships: [];
      };
      market_items: {
        Row: {
          id: string;
          name_key: string;
          price: number;
          color_hex: string;
          sort_order: number;
        };
        Insert: Database["public"]["Tables"]["market_items"]["Row"];
        Update: Partial<Database["public"]["Tables"]["market_items"]["Row"]>;
        Relationships: [];
      };
      user_market_inventory: {
        Row: { user_id: string; item_id: string; purchased_at: string };
        Insert: { user_id: string; item_id: string };
        Update: Partial<Database["public"]["Tables"]["user_market_inventory"]["Row"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          workout_reminders: boolean;
          water_reminder: boolean;
          sound_effects: boolean;
          chat_sounds: boolean;
          unit_system: string;
          updated_at: string;
        };
        Insert: { user_id: string } & Partial<
          Omit<Database["public"]["Tables"]["user_settings"]["Row"], "user_id">
        >;
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Row"]>;
        Relationships: [];
      };
      influencer_codes: {
        Row: {
          id: string;
          code: string;
          influencer_name: string;
          discount_pct: number;
          commission_pct: number;
          wallet_balance: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          code: string;
          influencer_name: string;
          discount_pct?: number;
          commission_pct?: number;
        };
        Update: Partial<Database["public"]["Tables"]["influencer_codes"]["Row"]>;
        Relationships: [];
      };
      daily_chest_claims: {
        Row: {
          user_id: string;
          utc_date: string;
          reward_kind: "gems" | "freezie";
          reward_amount: number;
          reward_rarity: string | null;
          idempotency_key: string;
          claimed_at: string;
        };
        Insert: {
          user_id: string;
          utc_date: string;
          reward_kind: "gems" | "freezie";
          reward_amount: number;
          reward_rarity?: string | null;
          idempotency_key: string;
          claimed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_chest_claims"]["Row"]>;
        Relationships: [];
      };
      cron_job_runs: {
        Row: {
          job_name: string;
          last_run_at: string;
          last_status: "ok" | "error";
          last_detail: Json | null;
          updated_at: string;
        };
        Insert: {
          job_name: string;
          last_run_at?: string;
          last_status: "ok" | "error";
          last_detail?: Json | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cron_job_runs"]["Row"]>;
        Relationships: [];
      };
      backup_verification_runs: {
        Row: {
          id: string;
          ran_at: string;
          status: "ok" | "error" | "degraded";
          migration_count: number | null;
          manifest: Json;
          detail: string | null;
        };
        Insert: {
          id?: string;
          ran_at?: string;
          status: "ok" | "error" | "degraded";
          migration_count?: number | null;
          manifest?: Json;
          detail?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["backup_verification_runs"]["Row"]>;
        Relationships: [];
      };
      idempotency_keys: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          idempotency_key: string;
          request_hash: string;
          status: "in_progress" | "completed";
          response_status: number | null;
          response_body: Json | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          idempotency_key: string;
          request_hash: string;
          status?: "in_progress" | "completed";
          response_status?: number | null;
          response_body?: Json | null;
          expires_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["idempotency_keys"]["Row"]>;
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          ip: string | null;
          created_at: string;
        };
        Insert: {
          admin_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          ip?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["admin_audit_log"]["Row"]>;
        Relationships: [];
      };
      pending_gifts: {
        Row: {
          id: string;
          user_id: string;
          reward_kind: string;
          amount: number;
          reason: string;
          granted_by: string | null;
          claimed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_kind: string;
          amount: number;
          reason?: string;
          granted_by?: string | null;
          claimed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pending_gifts"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string | null;
          body: string | null;
          title_key: string | null;
          body_key: string | null;
          params: Json | null;
          read: boolean;
          dedup_key: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          user_id: string;
          type: NotificationType;
          title?: string | null;
          body?: string | null;
          title_key?: string | null;
          body_key?: string | null;
          params?: Json | null;
          read?: boolean;
          dedup_key?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]>;
        Relationships: [];
      };
      native_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          platform: "ios" | "android";
          token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          platform: "ios" | "android";
          token: string;
        };
        Update: Partial<Database["public"]["Tables"]["native_push_tokens"]["Row"]>;
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
        Args: { p_request_key?: string | null; p_user_id?: string | null };
        Returns: CheckInResult;
      };
      claim_streak_gem_rewards: {
        Args: {
          p_user_id: string;
          p_claim_key: string;
          p_amount: number;
          p_description?: string;
        };
        Returns: Json;
      };
      earn_gems: {
        Args: GemMutationArgs;
        Returns: GemMutationResult;
      };
      spend_gems: {
        Args: GemMutationArgs;
        Returns: GemMutationResult;
      };
      check_and_increment_usage: {
        Args: {
          p_user_id: string;
          p_resource: UsageResource;
          p_amount?: number;
        };
        Returns: UsageCheckResult;
      };
      refund_usage: {
        Args: {
          p_user_id: string;
          p_resource: UsageResource;
          p_amount: number;
        };
        Returns: undefined;
      };
      get_usage_status: {
        Args: Record<string, never>;
        Returns: UsageStatusResult;
      };
      apply_subscription: {
        Args: ApplySubscriptionArgs;
        Returns: ProfileRow;
      };
      increment_condense_counter: {
        Args: { p_user_id: string; p_delta?: number };
        Returns: number;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_valid_timezone: {
        Args: { p_tz: string };
        Returns: boolean;
      };
      mark_notifications_read: {
        Args: { p_ids?: string[] | null };
        Returns: number;
      };
      get_inbox_previews: {
        Args: { p_coach_ids: string[] };
        Returns: {
          coach_id: string;
          content: string | null;
          created_at: string;
          sender: MessageSender;
          message_type: MessageType;
        }[];
      };
      process_referral: {
        Args: { p_referred_id: string; p_code: string };
        Returns: ProcessReferralResult;
      };
      get_global_leaderboard: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: GlobalLeaderboardEntry[];
      };
      get_country_leaderboard: {
        Args: { p_limit?: number };
        Returns: CountryLeaderboardEntry[];
      };
      get_user_rank: {
        Args: Record<string, never>;
        Returns: UserRankResult;
      };
      upsert_analytics_daily: {
        Args: { p_user_id: string; p_entry_date: string; p_patch: Json };
        Returns: Database["public"]["Tables"]["analytics_daily"]["Row"];
      };
      purchase_market_item: {
        Args: {
          p_user_id: string;
          p_item_id: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      admin_get_ai_cost_summary: {
        Args: { p_days?: number };
        Returns: Json;
      };
      admin_get_ai_cost_by_user: {
        Args: { p_days?: number; p_limit?: number };
        Returns: Json;
      };
      admin_get_quota_events: {
        Args: { p_days?: number; p_limit?: number };
        Returns: Json;
      };
      admin_get_overview_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      apply_daily_chest_reward: {
        Args: {
          p_user_id: string;
          p_utc_date: string;
          p_idempotency_key: string;
          p_reward_kind: string;
          p_reward_amount: number;
          p_reward_rarity?: string | null;
        };
        Returns: Json;
      };
      record_cron_run: {
        Args: {
          p_job_name: string;
          p_status: string;
          p_detail?: Json | null;
        };
        Returns: undefined;
      };
      set_active_aura: {
        Args: { p_user_id: string; p_item_id: string };
        Returns: Json;
      };
      grant_freezie: {
        Args: { p_user_id: string; p_amount: number };
        Returns: number;
      };
      claim_pending_gift: {
        Args: { p_gift_id: string };
        Returns: Json;
      };
    };
    Enums: {
      onboarding_status: OnboardingStatus;
      subscription_tier: SubscriptionTier;
      gem_transaction_type: GemTransactionType;
      usage_resource: UsageResource;
      message_sender: MessageSender;
      message_type: MessageType;
      notification_type: NotificationType;
      ai_provider: AiProvider;
    };
    CompositeTypes: Record<string, never>;
  };
};
