import type {
  BillingCycle,
  CheckInResult,
  CountryLeaderboardEntry,
  Database,
  GlobalLeaderboardEntry,
  Json,
  MessageSender,
  MessageType,
  ProfileRole,
  SubscriptionTier,
  ThreadType,
  UsageNode,
  UsageStatusResult,
  WarningTrigger,
} from "@/lib/types/database.types";
import {
  resolveCountryCode,
  resolveDisplayName,
  resolveExperience,
  resolveHeightCm,
  resolveTier,
  resolveWeightKg,
  type ProfileRowLike,
} from "@/lib/supabase/profile-compat";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"] & ProfileRowLike;
export type CoachRow = Database["public"]["Tables"]["coaches"]["Row"];
export type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];

/** Frontend-facing profile shape (camelCase, no sensitive internal columns). */
export type ProfileDTO = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  experienceLevel: string | null;
  isNatural: boolean;
  bio: string | null;
  countryCode: string;
  cityName: string | null;
  locale: string;
  timezone: string;
  role: ProfileRole;
  onboardingStatus: Database["public"]["Enums"]["onboarding_status"];
  tier: Database["public"]["Enums"]["subscription_tier"] | null;
  billingCycle: BillingCycle;
  referralCode: string;
  referredByCode: string | null;
  teamChatUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export function mapProfileRow(row: ProfileRow): ProfileDTO {
  return {
    id: row.id,
    displayName: resolveDisplayName(row),
    avatarUrl: row.avatar_url ?? null,
    gender: row.gender,
    heightCm: resolveHeightCm(row),
    weightKg: resolveWeightKg(row),
    experienceLevel: resolveExperience(row),
    isNatural: row.is_natural,
    bio: row.bio,
    countryCode: resolveCountryCode(row),
    cityName: row.city_name ?? null,
    locale: row.locale,
    timezone: row.timezone ?? "UTC",
    role: row.role,
    onboardingStatus: row.onboarding_status,
    tier: resolveTier(row),
    billingCycle: row.billing_cycle,
    referralCode: row.referral_code,
    referredByCode: row.referred_by_code ?? null,
    teamChatUnlocked: row.team_chat_unlocked,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Frontend-facing coach shape. */
export type CoachDTO = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  theme: Json;
  supportsVision: boolean;
  sortOrder: number;
};

export function mapCoachRow(row: CoachRow): CoachDTO {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    theme: row.theme,
    supportsVision: row.supports_vision,
    sortOrder: row.sort_order,
  };
}

/** Frontend-facing chat message shape. */
export type ChatMessageDTO = {
  id: string;
  coachId: string | null;
  threadType: ThreadType;
  sender: MessageSender;
  messageType: MessageType;
  content: string | null;
  payload: Json | null;
  createdAt: string;
};

/** Frontend-facing global leaderboard entry. */
export type LeaderboardEntryDTO = {
  rank: number;
  userId: string;
  name: string;
  flagCode: string;
  avatar: string;
  streak: number;
  longestStreak: number;
};

export function mapLeaderboardEntry(
  row: GlobalLeaderboardEntry,
): LeaderboardEntryDTO {
  return {
    rank: row.rank,
    userId: row.user_id,
    name: row.display_name,
    flagCode: row.country_code.toLowerCase(),
    avatar: row.avatar_url ?? "",
    streak: row.current_streak,
    longestStreak: row.longest_streak,
  };
}

/** Frontend-facing country leaderboard entry. */
export type CountryLeaderboardDTO = {
  rank: number;
  countryCode: string;
  flagCode: string;
  totalStreak: number;
  userCount: number;
  avgStreak: number;
};

export function mapCountryLeaderboardEntry(
  row: CountryLeaderboardEntry,
): CountryLeaderboardDTO {
  return {
    rank: row.rank,
    countryCode: row.country_code.toLowerCase(),
    flagCode: row.country_code.toLowerCase(),
    totalStreak: row.total_streak,
    userCount: row.user_count,
    avgStreak: row.avg_streak,
  };
}

export function mapChatMessageRow(row: ChatMessageRow): ChatMessageDTO {
  return {
    id: row.id,
    coachId: row.coach_id,
    threadType: row.thread_type,
    sender: row.sender,
    messageType: row.message_type,
    content: row.content,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

/** Frontend-facing check-in result (camelCase). */
export type CheckInDTO = {
  alreadyCheckedIn: boolean;
  currentStreak: number;
  longestStreak: number;
  freezieBalance: number;
  freezieAwarded: boolean;
  streakDropped: boolean;
  streakProtected: boolean;
  gemsAwarded: number;
  gemBalance: number;
  kaiUnlockedLevel: number;
  kaiLevelUp: boolean;
  checkedInDate: string;
};

export function mapCheckInResult(result: CheckInResult): CheckInDTO {
  return {
    alreadyCheckedIn: result.already_checked_in,
    currentStreak: result.current_streak,
    longestStreak: result.longest_streak,
    freezieBalance: result.freezie_balance,
    freezieAwarded: result.freezie_awarded,
    streakDropped: result.streak_dropped,
    streakProtected: result.streak_protected,
    gemsAwarded: result.gems_awarded,
    gemBalance: result.gem_balance,
    kaiUnlockedLevel: result.kai_unlocked_level,
    kaiLevelUp: result.kai_level_up,
    checkedInDate: result.checked_in_date,
  };
}

/** Frontend-facing usage status (camelCase). */
export type UsageNodeDTO = {
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  warning: WarningTrigger | null;
};

export type UsageStatusDTO = {
  tier: SubscriptionTier | null;
  textTokens: UsageNodeDTO;
  mayaPhoto: UsageNodeDTO;
  leoPhoto: UsageNodeDTO;
};

function mapUsageNode(node: UsageNode): UsageNodeDTO {
  return {
    used: node.used,
    limit: node.limit,
    remaining: node.remaining,
    percent: node.percent,
    warning: node.warning,
  };
}

export function mapUsageStatus(result: UsageStatusResult): UsageStatusDTO {
  return {
    tier: result.tier,
    textTokens: mapUsageNode(result.text_tokens),
    mayaPhoto: mapUsageNode(result.maya_photo),
    leoPhoto: mapUsageNode(result.leo_photo),
  };
}
