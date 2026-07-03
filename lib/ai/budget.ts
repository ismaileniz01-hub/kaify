/**
 * Central AI cost controls — SERVER ONLY.
 *
 * One place to tune provider spend WITHOUT degrading quality. Every value is a
 * completion (output) token ceiling unless noted, and each can be overridden in
 * production via an env var for live tuning with no code change.
 *
 * Why caps improve quality *and* cost: a coach that texts like a human sends
 * short, warm messages — an uncapped model tends to ramble, which is both more
 * expensive and less human. The ceilings below are generous enough that normal
 * replies are never truncated.
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

export const TOKEN_BUDGET = {
  /** Main coach chat reply (DeepSeek stream). */
  chatReply: envInt("AI_MAX_CHAT_TOKENS", 800),
  /** Image analysis → personalized summary (DeepSeek synthesis). */
  synthesis: envInt("AI_MAX_SYNTHESIS_TOKENS", 700),
  /** Structured card JSON (workout / meal / daily summary). */
  structuredCard: envInt("AI_MAX_CARD_TOKENS", 900),
  /** Analytics extraction JSON (small). */
  analytics: envInt("AI_MAX_ANALYTICS_TOKENS", 120),
  /** Memory condensation summary. */
  memory: envInt("AI_MAX_MEMORY_TOKENS", 350),
  /** Team meeting turn. */
  teamChat: envInt("AI_MAX_TEAM_TOKENS", 700),
  /** Home screen motivational copy. */
  homeCopy: envInt("AI_MAX_HOME_TOKENS", 160),
} as const;

export const CONTEXT_BUDGET = {
  /**
   * Recent chat turns sent as context on each message. Older facts are carried
   * by condensed memory, so a smaller window trims input cost without the coach
   * "forgetting" the conversation. History is resent every turn, so this is the
   * dominant per-message input cost — 8 turns (~4 exchanges) + condensed memory
   * keeps continuity while roughly halving that cost versus 14.
   */
  historyTurns: envInt("AI_CONTEXT_TURNS", 8),
  /** Max characters of condensed memory injected per request. */
  memoryChars: envInt("AI_MEMORY_CHARS", 1200),
  /**
   * Cap each historical user/coach message when building context. Long past
   * replies (Markdown essays) are the silent token killer — trim the tail only.
   */
  historyUserChars: envInt("AI_HISTORY_USER_CHARS", 400),
  historyCoachChars: envInt("AI_HISTORY_COACH_CHARS", 600),
} as const;

/** Runtime feature toggles — tune in Vercel without redeploying logic. */
export const AI_FEATURES = {
  /**
   * Second model call that renders workout/meal/daily cards (~900 output tokens).
   * Set AI_STRUCTURED_CARDS=false to disable entirely (biggest optional save).
   */
  structuredCards: envBool("AI_STRUCTURED_CARDS", true),
  /**
   * Cheap post-reply extraction that logs workouts/macros to analytics.
   * Set AI_CHAT_ANALYTICS=false to skip.
   */
  chatAnalytics: envBool("AI_CHAT_ANALYTICS", true),
} as const;
