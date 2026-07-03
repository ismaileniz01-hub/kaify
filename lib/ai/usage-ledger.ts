import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  estimateCostMicroUsd,
  geminiVisionTokenEstimate,
  type AiProvider,
} from "@/lib/ai/cost";
import type { TokenUsage } from "@/lib/ai/types";

/** Known AI operations for cost attribution. */
export type AiOperation =
  | "chat"
  | "chat_stream"
  | "synthesis"
  | "vision"
  | "quality_gate"
  | "structured_card"
  | "analytics"
  | "memory"
  | "team_chat"
  | "home_copy"
  | "self_heal_report";

export type UsageContext = {
  userId?: string | null;
  operation: AiOperation;
};

export type RecordUsageParams = {
  provider: AiProvider;
  context: UsageContext;
  usage: TokenUsage | null;
  /** When the provider omits usage (Gemini), supply an estimate. */
  estimatedTotalTokens?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget AI usage ledger write. Never blocks or fails the caller.
 */
export function recordAiUsage(params: RecordUsageParams): void {
  void recordAiUsageAsync(params).catch((error) => {
    logger.warn("ai usage ledger write failed", {
      operation: params.context.operation,
      error: error instanceof Error ? error.message : "unknown",
    });
  });
}

async function recordAiUsageAsync(params: RecordUsageParams): Promise<void> {
  let usageInput = params.usage;
  if (!usageInput && params.estimatedTotalTokens) {
    usageInput = {
      prompt_tokens: Math.round(params.estimatedTotalTokens * 0.85),
      completion_tokens: Math.round(params.estimatedTotalTokens * 0.15),
      total_tokens: params.estimatedTotalTokens,
    };
  }
  if (!usageInput || usageInput.total_tokens <= 0) return;

  const cost = estimateCostMicroUsd(params.provider, usageInput);

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("ai_usage_ledger").insert({
    user_id: params.context.userId ?? null,
    provider: params.provider,
    operation: params.context.operation,
    prompt_tokens: cost.promptTokens,
    completion_tokens: cost.completionTokens,
    total_tokens: cost.totalTokens,
    estimated_usd_micro: cost.usdMicro,
    metadata: (params.metadata ?? null) as never,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Helper for Gemini vision calls without usage metadata. */
export function geminiEstimatedUsage(promptChars: number, hasImage: boolean): TokenUsage {
  const textTokens = Math.ceil(promptChars / 4);
  const imageTokens = hasImage ? geminiVisionTokenEstimate() : 0;
  const total = textTokens + imageTokens;
  return {
    prompt_tokens: total,
    completion_tokens: 200,
    total_tokens: total + 200,
  };
}
