import type { Database } from "@/lib/types/database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

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
  locale: string;
  onboardingStatus: Database["public"]["Enums"]["onboarding_status"];
  tier: Database["public"]["Enums"]["subscription_tier"];
  referralCode: string;
  referredByCode: string | null;
  teamChatUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export function mapProfileRow(row: ProfileRow): ProfileDTO {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    gender: row.gender,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    experienceLevel: row.experience_level,
    isNatural: row.is_natural,
    bio: row.bio,
    countryCode: row.country_code,
    locale: row.locale,
    onboardingStatus: row.onboarding_status,
    tier: row.tier,
    referralCode: row.referral_code,
    referredByCode: row.referred_by_code,
    teamChatUnlocked: row.team_chat_unlocked,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
