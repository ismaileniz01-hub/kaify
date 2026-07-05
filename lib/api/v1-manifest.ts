/** Stable v1 public API surface (Architecture Faz 4). */
export const API_V1_SUNSET = "Sun, 01 Jan 2027 00:00:00 GMT";

/** Paths excluded from legacy deprecation headers. */
export const API_LEGACY_EXCLUDED_PREFIXES = [
  "/api/v1/",
  "/api/cron/",
  "/api/admin/",
  "/api/webhooks/",
  "/api/auth/",
  "/api/health", // liveness probe (exact + /steps handled via v1)
  "/api/waitlist",
  "/api/subscribe",
] as const;

/** Canonical v1 routes — keep in sync with tests/architecture/v1-routes.test.ts */
export const API_V1_ROUTES = [
  "/api/v1/check-in",
  "/api/v1/profile",
  "/api/v1/profile/export",
  "/api/v1/profile/avatar",
  "/api/v1/chat/[coachId]",
  "/api/v1/chat/[coachId]/analyze",
  "/api/v1/chat/team",
  "/api/v1/streak",
  "/api/v1/streak/rewards",
  "/api/v1/gems",
  "/api/v1/market",
  "/api/v1/market/purchase",
  "/api/v1/market/chest",
  "/api/v1/analytics",
  "/api/v1/settings",
  "/api/v1/onboarding",
  "/api/v1/usage",
  "/api/v1/kai",
  "/api/v1/home",
  "/api/v1/notifications",
  "/api/v1/messages",
  "/api/v1/referral",
  "/api/v1/health/steps",
  "/api/v1/consent",
  "/api/v1/leaderboard/global",
  "/api/v1/leaderboard/country",
  "/api/v1/push/subscribe",
  "/api/v1/push/native",
] as const;

export function isLegacyPublicApi(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  for (const prefix of API_LEGACY_EXCLUDED_PREFIXES) {
    if (pathname.startsWith(prefix)) return false;
  }
  return true;
}

export function legacyApiDeprecationHeaders(): Record<string, string> {
  return {
    Deprecation: "true",
    Sunset: API_V1_SUNSET,
    Link: "</api/v1/profile>; rel=\"successor-version\"",
  };
}
