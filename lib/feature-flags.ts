/**
 * Environment-backed feature flags (Architecture Faz 3).
 * Prefer env over hardcoded toggles; migrate to LaunchDarkly when team grows.
 */

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes";
}

export const featureFlags = {
  /** Structured workout/meal cards in chat (higher token cost). */
  structuredChatCards: () => envFlag("AI_STRUCTURED_CARDS"),
  /** Inject daily analytics into coach context. */
  chatAnalytics: () => envFlag("AI_CHAT_ANALYTICS"),
  /** Weekly team meeting generation. */
  teamMeeting: () => envFlag("FEATURE_TEAM_MEETING", true),
  /** Native push registration UI. */
  nativePush: () => envFlag("FEATURE_NATIVE_PUSH", true),
  /** Paddle billing webhook processing. */
  paddleBilling: () =>
    envFlag("FEATURE_PADDLE", Boolean(process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim())),
  /**
   * Minimum-PII product event spine. Production stays off until legal/privacy
   * approves a TTL (ADR 008). Tests default on so allowlist coverage is real.
   */
  productEvents: () =>
    envFlag(
      "FEATURE_PRODUCT_EVENTS",
      process.env.NODE_ENV === "test" || process.env.VITEST === "true",
    ),
  /**
   * Versioned workout plans + session history. Default on; library logging
   * still increments the daily workout counter if the tables are not applied.
   */
  workoutPlans: () => envFlag("FEATURE_WORKOUT_PLANS", true),
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag]();
}
