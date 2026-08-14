/**
 * Environment-backed feature flags (Architecture Faz 3).
 * Prefer env over hardcoded toggles; migrate to LaunchDarkly when team grows.
 *
 * AI runtime flags (structured cards, chat analytics, KAIOS) live ONLY in
 * `AI_FEATURES` (`lib/ai/budget.ts`) — do not duplicate them here. Product
 * callers must import AI_FEATURES for AI path control so there is a single
 * source of truth and no accidental dual-flag divergence.
 */

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes";
}

export const featureFlags = {
  /**
   * @deprecated Prefer AI_FEATURES.structuredCards — kept as a thin env mirror
   * for non-AI product surfaces that only need a boolean probe.
   */
  structuredChatCards: () => envFlag("AI_STRUCTURED_CARDS"),
  /**
   * @deprecated Prefer AI_FEATURES.chatAnalytics.
   */
  chatAnalytics: () => envFlag("AI_CHAT_ANALYTICS"),
  /** Weekly team meeting generation. */
  teamMeeting: () => envFlag("FEATURE_TEAM_MEETING", true),
  /** Native push registration UI. */
  nativePush: () => envFlag("FEATURE_NATIVE_PUSH", true),
  /** Paddle billing webhook processing. */
  paddleBilling: () =>
    envFlag("FEATURE_PADDLE", Boolean(process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim())),
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag]();
}
