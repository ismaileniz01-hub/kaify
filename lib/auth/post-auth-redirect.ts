import type { SubscriptionTier } from "@/lib/types/database.types";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-redirect";
import { entitlementIsActive } from "@/lib/billing/entitlement";

export function hasActiveSubscription(
  tier: SubscriptionTier | null | undefined,
  tierExpiresAt?: string | null,
): boolean {
  if (tier == null) return false;
  if (!tierExpiresAt) return true;
  const expiresAt = Date.parse(tierExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

type ProfileLike = {
  tier?: SubscriptionTier | null;
  /** Set only by Paddle `apply_subscription`. Missing = never paid. */
  tierStartedAt?: string | null;
  tierExpiresAt?: string | null;
};

/** True when Paddle actually granted a plan — not a leftover default tier. */
export function hasPaidPlan(
  profile: ProfileLike | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.tierStartedAt === undefined) {
    return hasActiveSubscription(profile.tier, profile.tierExpiresAt);
  }
  return entitlementIsActive(profile);
}

type PostAuthOptions = {
  /** Store binary: never open website checkout routes. */
  native?: boolean;
};

/**
 * After auth, unpaid web users go to pricing.
 * Native shells never open pricing CTAs — unpaid members stay off product
 * routes (Settings still reachable for account deletion).
 */
export function resolvePostAuthRedirect(
  profile: ProfileLike | null | undefined,
  requested?: string | null,
  options?: PostAuthOptions,
): string {
  const safe = sanitizeAuthRedirect(requested);
  if (safe === "/settings" || safe.startsWith("/settings/")) {
    return safe;
  }
  if (!hasPaidPlan(profile)) {
    if (options?.native) {
      return "/login";
    }
    return "/pricing";
  }
  return safe;
}

const SUBSCRIPTION_REQUIRED_PREFIXES = [
  "/welcome",
  "/messages",
  "/chat",
  "/analytics",
  "/streak",
  "/trophy-road",
  "/leaderboard",
  "/library",
  "/admin",
  "/myaccount",
] as const;

export function requiresActiveSubscription(pathname: string): boolean {
  return SUBSCRIPTION_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
