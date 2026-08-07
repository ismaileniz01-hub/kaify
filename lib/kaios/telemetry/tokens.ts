/**
 * Token estimate helpers for KAIOS prompt telemetry (chars/4 heuristic).
 */

export type TokenBreakdown = {
  core: number;
  safety: number;
  capsules: number;
  locale: number;
  trusted: number;
  knowledge: number;
  outputHint: number;
  history: number;
  userMessage: number;
  total: number;
};

export type TokenTelemetryRecord = {
  coach: string;
  intent: string;
  tier: number;
  estimatedInputTokens: number;
  maxOutputTokens: number;
  breakdown: TokenBreakdown;
  at: string;
};

/** Coarse provider-agnostic estimate used for budgets and tests. */
export function estimateCharsToTokens(chars: number): number {
  if (!Number.isFinite(chars) || chars <= 0) return 0;
  return Math.ceil(chars / 4);
}

export function estimateTextTokens(text: string): number {
  return estimateCharsToTokens(text.length);
}

export function buildTokenBreakdown(
  parts: Omit<TokenBreakdown, "total">,
): TokenBreakdown {
  const total =
    parts.core +
    parts.safety +
    parts.capsules +
    parts.locale +
    parts.trusted +
    parts.knowledge +
    parts.outputHint +
    parts.history +
    parts.userMessage;
  return { ...parts, total };
}

export function createTokenTelemetryRecord(input: {
  coach: string;
  intent: string;
  tier: number;
  breakdown: TokenBreakdown;
  maxOutputTokens: number;
}): TokenTelemetryRecord {
  return {
    coach: input.coach,
    intent: input.intent,
    tier: input.tier,
    estimatedInputTokens: input.breakdown.total,
    maxOutputTokens: input.maxOutputTokens,
    breakdown: input.breakdown,
    at: new Date().toISOString(),
  };
}
