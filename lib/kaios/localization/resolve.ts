/**
 * Deterministic language-resolution helpers (KAIOS localization § rules).
 * Capsules still carry style guidance; this module encodes switch/non-switch
 * behavior for tests and optional product callers.
 */

const SHORT_EXPRESSIONS = new Set(
  [
    "ok",
    "okay",
    "yes",
    "no",
    "yep",
    "yup",
    "nope",
    "thanks",
    "thank you",
    "ty",
    "thx",
    "lol",
    "lmao",
    "bro",
    "haha",
    "hahaha",
    "wow",
    "nice",
    "cool",
    "sure",
    "tamam",
    "evet",
    "hayır",
    "hayir",
    "sağol",
    "sagol",
    "teşekkürler",
    "tesekkurler",
    "teşekkür",
    "tesekkur",
  ].map((s) => s.toLowerCase()),
);

const EMOJI_OR_SYMBOL_ONLY = /^[\p{Emoji}\p{P}\p{S}\s0-9]+$/u;

export type ResolveActiveLocaleInput = {
  /** Explicit user instruction like "speak Turkish" / "Türkçe konuş". */
  explicitLocale?: string | null;
  /** Detected meaningful language of the current user message (BCP-47). */
  messageLocale?: string | null;
  /** Saved app language preference. */
  savedLocale?: string | null;
  /** Device / system locale. */
  deviceLocale?: string | null;
  /** Product fallback. */
  fallbackLocale?: string;
  /** Raw current message (for short-expression checks). */
  message?: string;
};

/**
 * Short / borrowed expressions must not flip the active conversation locale.
 */
export function isNonSwitchingExpression(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (EMOJI_OR_SYMBOL_ONLY.test(trimmed)) return true;
  const normalized = trimmed
    .toLowerCase()
    .replace(/[!?.…,]+$/g, "")
    .trim();
  if (SHORT_EXPRESSIONS.has(normalized)) return true;
  // Single common exercise / brand tokens
  if (/^[a-z][a-z0-9_-]{1,24}$/i.test(trimmed) && trimmed.length <= 16) {
    return /^(squat|deadlift|bench|rdl|ohp|protein|creatine|kaify)$/i.test(
      trimmed,
    );
  }
  return false;
}

/**
 * Resolve active reply locale using KAIOS priority order.
 * Short expressions keep the saved/app locale instead of switching.
 */
export function resolveActiveLocale(input: ResolveActiveLocaleInput): string {
  const fallback = (input.fallbackLocale || "en").trim() || "en";
  if (input.explicitLocale?.trim()) return input.explicitLocale.trim();

  const message = input.message ?? "";
  if (message && isNonSwitchingExpression(message)) {
    return (
      input.savedLocale?.trim() ||
      input.deviceLocale?.trim() ||
      fallback
    );
  }

  if (input.messageLocale?.trim()) return input.messageLocale.trim();
  if (input.savedLocale?.trim()) return input.savedLocale.trim();
  if (input.deviceLocale?.trim()) return input.deviceLocale.trim();
  return fallback;
}

/**
 * Turkish-aware lowercasing for product display keys (not English strings).
 * English MUST NOT use this path.
 */
export function toLocaleLowerCaseTurkish(text: string): string {
  return text.replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr-TR");
}

/**
 * English / generic lowercasing — must not apply Turkish dotted-I rules.
 */
export function toLocaleLowerCaseEnglish(text: string): string {
  return text.toLocaleLowerCase("en-US");
}
