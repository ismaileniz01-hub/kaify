/**
 * AI provider pricing — SERVER ONLY.
 *
 * Costs are estimated from env-tunable rates (USD per 1M tokens). Defaults reflect
 * public DeepSeek / Gemini Flash-Lite list pricing; override in production when
 * your contract differs.
 */

export type AiProvider = "deepseek" | "gemini";

export type TokenUsageInput = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  /** Prefix-cache hits (DeepSeek) — billed far cheaper than fresh input. */
  prompt_cache_hit_tokens?: number;
};

const MICRO = 1_000_000;

function envRate(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** USD per 1M input tokens. */
export function inputRatePer1M(provider: AiProvider): number {
  if (provider === "deepseek") {
    return envRate("AI_COST_DEEPSEEK_INPUT_PER_1M", 0.14);
  }
  return envRate("AI_COST_GEMINI_INPUT_PER_1M", 0.075);
}

/** USD per 1M output tokens. */
export function outputRatePer1M(provider: AiProvider): number {
  if (provider === "deepseek") {
    return envRate("AI_COST_DEEPSEEK_OUTPUT_PER_1M", 0.28);
  }
  return envRate("AI_COST_GEMINI_OUTPUT_PER_1M", 0.3);
}

/**
 * USD per 1M prefix-cache-HIT input tokens. DeepSeek bills cached prefixes at a
 * large discount (~10% of fresh input), so a stable system+history prefix makes
 * repeat turns much cheaper. Other providers fall back to the normal input rate.
 */
export function cacheHitRatePer1M(provider: AiProvider): number {
  if (provider === "deepseek") {
    return envRate("AI_COST_DEEPSEEK_CACHE_HIT_PER_1M", 0.014);
  }
  return inputRatePer1M(provider);
}

/** Default vision call estimate when Gemini omits usage metadata. */
export function geminiVisionTokenEstimate(): number {
  const raw = Number.parseInt(process.env.AI_COST_GEMINI_VISION_EST_TOKENS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1200;
}

/**
 * Estimates USD cost and returns micro-dollars (6 decimal places) for storage.
 */
export function estimateCostMicroUsd(
  provider: AiProvider,
  usage: TokenUsageInput,
): { promptTokens: number; completionTokens: number; totalTokens: number; usdMicro: number } {
  let prompt = usage.prompt_tokens ?? 0;
  let completion = usage.completion_tokens ?? 0;
  const total = usage.total_tokens ?? prompt + completion;

  if (total > 0 && prompt === 0 && completion === 0) {
    // Heuristic split when only total is known (typical chat ~70/30).
    prompt = Math.round(total * 0.7);
    completion = total - prompt;
  }

  // Split prompt tokens into cheap cache-hits and full-price fresh tokens.
  const cacheHit = Math.min(Math.max(usage.prompt_cache_hit_tokens ?? 0, 0), prompt);
  const freshInput = prompt - cacheHit;

  const inputUsd =
    (freshInput / MICRO) * inputRatePer1M(provider) +
    (cacheHit / MICRO) * cacheHitRatePer1M(provider);
  const outputUsd = (completion / MICRO) * outputRatePer1M(provider);
  const usdMicro = Math.round((inputUsd + outputUsd) * MICRO);

  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: total,
    usdMicro,
  };
}

export function microToUsd(micro: number): number {
  return Math.round((micro / MICRO) * 10000) / 10000;
}

/** Daily token threshold per user before anomaly flag (env override). */
export function userDailyTokenAlertThreshold(): number {
  const raw = Number.parseInt(process.env.AI_COST_USER_DAILY_TOKENS_ALERT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 80_000;
}

/** Global daily spend multiplier vs 7-day average to trigger alert. */
export function dailyAnomalyMultiplier(): number {
  const raw = Number.parseFloat(process.env.AI_COST_DAILY_ANOMALY_MULTIPLIER ?? "");
  return Number.isFinite(raw) && raw > 1 ? raw : 3;
}
