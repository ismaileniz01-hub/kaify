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
  /** Lemon Squeezy billing webhook processing. */
  lemonSqueezyBilling: () =>
    envFlag("FEATURE_LEMON_SQUEEZY", Boolean(process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim())),
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag]();
}
