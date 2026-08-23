import type { SubscriptionTier } from "@/lib/types/database.types";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-redirect";

export function hasActiveSubscription(
  tier: SubscriptionTier | null | undefined,
): boolean {
  return tier != null;
}

type ProfileLike = {
  tier?: SubscriptionTier | null;
};

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
  if (!hasActiveSubscription(profile?.tier)) {
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
