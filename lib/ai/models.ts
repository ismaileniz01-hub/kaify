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

/** Default Gemini Vision model. Alias tracks Google's current flash-lite line. */
export const GEMINI_DEFAULT_MODEL = "gemini-flash-lite-latest";

/**
 * Models we have validated for streaming + JSON + usage reporting.
 * Env may only select from this list — obsolete/typo IDs are loud failures.
 */
export const DEEPSEEK_ALLOWED_MODELS = [
  "deepseek-chat",
  "deepseek-reasoner",
] as const;

export const GEMINI_ALLOWED_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

export type DeepSeekAllowedModel = (typeof DEEPSEEK_ALLOWED_MODELS)[number];
export type GeminiAllowedModel = (typeof GEMINI_ALLOWED_MODELS)[number];

export function isAllowedDeepSeekModel(model: string): model is DeepSeekAllowedModel {
  return (DEEPSEEK_ALLOWED_MODELS as readonly string[]).includes(model);
}

export function isAllowedGeminiModel(model: string): model is GeminiAllowedModel {
  return (GEMINI_ALLOWED_MODELS as readonly string[]).includes(model);
}
