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

/** After auth, send users without a paid plan to pricing — except Settings, which must stay reachable for account deletion. Native shells go to My account instead of /pricing. */
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
    return options?.native ? "/myaccount" : "/pricing";
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
] as const;

export function requiresActiveSubscription(pathname: string): boolean {
  return SUBSCRIPTION_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
