import type { SubscriptionTier } from "@/lib/types/database.types";

/** Team chat is a Pro / Premium feature — Essential never qualifies. */
export function isTeamChatPlan(tier: SubscriptionTier | string | null | undefined): boolean {
  return tier === "pro" || tier === "premium_max";
}

/**
 * True only when the user's plan includes team chat AND streak unlock is earned.
 * Essential remains locked even after a 7-day streak.
 */
export function canUseTeamChat(input: {
  tier: SubscriptionTier | string | null | undefined;
  teamChatUnlocked: boolean | null | undefined;
}): boolean {
  return isTeamChatPlan(input.tier) && Boolean(input.teamChatUnlocked);
}
