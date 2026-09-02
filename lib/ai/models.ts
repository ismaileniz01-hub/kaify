/**
 * Canonical KAIOS provider/model IDs.
 *
 * Coach logic must not embed vendor model strings. Adapters read these
 * defaults (overridable via env). Unknown IDs fail closed at config load.
 *
 * DEFAULT: DEEPSEEK_DEFAULT_MODEL / GEMINI_DEFAULT_MODEL (used when env unset)
 * PRODUCTION_REQUIRED_VALUE: same IDs unless a listed allowlist alias is set
 * TEST_VALUE: same as DEFAULT (unit tests do not call live providers)
 */

export const DEEPSEEK_PROVIDER = "deepseek" as const;
export const GEMINI_PROVIDER = "gemini" as const;

/** Default conversational / synthesis model (OpenAI-compatible Chat Completions). */
export const DEEPSEEK_DEFAULT_MODEL = "deepseek-chat";

/**
 * Default Gemini Vision model (production contract).
 * Pin a GA ID — do not rely on `-latest` aliases for canary/prod.
 */
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Models we have validated for streaming + JSON + usage reporting.
 * Env may only select from this list — obsolete/typo IDs are loud failures.
 */
export const DEEPSEEK_ALLOWED_MODELS = [
  "deepseek-chat",
  "deepseek-reasoner",
] as const;

export const GEMINI_ALLOWED_MODELS = [
  "gemini-2.5-flash",
  /** Explicit rollback / soak IDs. */
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
] as const;

export type DeepSeekAllowedModel = (typeof DEEPSEEK_ALLOWED_MODELS)[number];
export type GeminiAllowedModel = (typeof GEMINI_ALLOWED_MODELS)[number];

export function isAllowedDeepSeekModel(model: string): model is DeepSeekAllowedModel {
  return (DEEPSEEK_ALLOWED_MODELS as readonly string[]).includes(model);
}

export function isAllowedGeminiModel(model: string): model is GeminiAllowedModel {
  return (GEMINI_ALLOWED_MODELS as readonly string[]).includes(model);
}

/**
 * Thinking depth for vision JSON. MEDIUM is the product contract
 * (quality over min-latency). Gemini 3 maps this to `thinkingLevel`;
 * Gemini 2.5 Flash maps it to `thinkingBudget`. Override only via
 * GEMINI_THINKING_LEVEL if the value is in GEMINI_THINKING_LEVELS.
 */
export const GEMINI_THINKING_LEVELS = ["MINIMAL", "LOW", "MEDIUM", "HIGH"] as const;
export type GeminiThinkingLevel = (typeof GEMINI_THINKING_LEVELS)[number];
export const GEMINI_DEFAULT_THINKING_LEVEL: GeminiThinkingLevel = "MEDIUM";

/**
 * Gemini 2.5 Flash thinks by default (budget 8192). That collides with
 * vision JSON `maxOutputTokens` and returns empty candidates. Cap the
 * budget so JSON still fits. Lite keeps thinking off unless configured.
 */
export const GEMINI_25_FLASH_THINKING_BUDGET = {
  MINIMAL: 0,
  LOW: 0,
  MEDIUM: 2048,
  HIGH: 4096,
} as const satisfies Record<GeminiThinkingLevel, number>;

export function gemini25ThinkingBudget(level: GeminiThinkingLevel): number {
  return GEMINI_25_FLASH_THINKING_BUDGET[level];
}

/** Gemini 3.x REST: omit sampling params; set thinkingLevel instead of thinkingBudget. */
export function isGemini3Model(model: string): boolean {
  return model.startsWith("gemini-3");
}

/** Gemini 2.5 Flash (not Lite) — must send thinkingBudget, not thinkingLevel. */
export function isGemini25FlashModel(model: string): boolean {
  return model.startsWith("gemini-2.5-flash") && !model.includes("lite");
}
