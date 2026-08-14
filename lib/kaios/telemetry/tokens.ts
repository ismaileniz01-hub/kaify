/**
 * Token estimate helpers + provider-usage telemetry for KAIOS.
 * Estimates use chars/4; live provider fields are recorded when available.
 */

import type { TokenUsage } from "@/lib/ai/types";

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

/** Provider usage snapshot when the model returns usage accounting. */
export type ProviderUsageTelemetry = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cacheHitTokens: number | null;
  cacheMissTokens: number | null;
  source: "provider" | "estimate" | "unavailable";
};

export type TokenTelemetryRecord = {
  coach: string;
  intent: string;
  tier: number;
  estimatedInputTokens: number;
  maxOutputTokens: number;
  breakdown: TokenBreakdown;
  providerUsage: ProviderUsageTelemetry;
  modelCallCount: number;
  visionCallCount: number;
  latencyMs: number | null;
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

export function providerUsageFromTokenUsage(
  usage: TokenUsage | null | undefined,
): ProviderUsageTelemetry {
  if (!usage) {
    return {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      cacheHitTokens: null,
      cacheMissTokens: null,
      source: "unavailable",
    };
  }
  return {
    inputTokens: usage.prompt_tokens ?? null,
    outputTokens: usage.completion_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
    cacheHitTokens: usage.prompt_cache_hit_tokens ?? null,
    cacheMissTokens: usage.prompt_cache_miss_tokens ?? null,
    source: "provider",
  };
}

export function createTokenTelemetryRecord(input: {
  coach: string;
  intent: string;
  tier: number;
  breakdown: TokenBreakdown;
  maxOutputTokens: number;
  providerUsage?: ProviderUsageTelemetry;
  modelCallCount?: number;
  visionCallCount?: number;
  latencyMs?: number | null;
}): TokenTelemetryRecord {
  return {
    coach: input.coach,
    intent: input.intent,
    tier: input.tier,
    estimatedInputTokens: input.breakdown.total,
    maxOutputTokens: input.maxOutputTokens,
    breakdown: input.breakdown,
    providerUsage:
      input.providerUsage ??
      ({
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        cacheHitTokens: null,
        cacheMissTokens: null,
        source: "unavailable",
      } satisfies ProviderUsageTelemetry),
    modelCallCount: input.modelCallCount ?? 0,
    visionCallCount: input.visionCallCount ?? 0,
    latencyMs: input.latencyMs ?? null,
    at: new Date().toISOString(),
  };
}

/**
 * Attach live provider usage onto an existing telemetry record (mutates copy).
 */
export function withProviderUsage(
  record: TokenTelemetryRecord,
  usage: TokenUsage | null | undefined,
  extras?: {
    modelCallCount?: number;
    visionCallCount?: number;
    latencyMs?: number | null;
  },
): TokenTelemetryRecord {
  return {
    ...record,
    providerUsage: providerUsageFromTokenUsage(usage),
    modelCallCount: extras?.modelCallCount ?? record.modelCallCount,
    visionCallCount: extras?.visionCallCount ?? record.visionCallCount,
    latencyMs: extras?.latencyMs ?? record.latencyMs,
  };
}
