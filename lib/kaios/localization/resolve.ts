/**
 * Deterministic language-resolution helpers (KAIOS localization § rules).
 * Capsules still carry style guidance; this module encodes switch/non-switch
 * behavior for tests and optional product callers.
 */

import { foldDiacritics } from "@/lib/i18n/fold-diacritics";

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
    "tamamdır",
    "tamamdir",
    "evet",
    "hayır",
    "hayir",
    "sağol",
    "sagol",
    "sağolar",
    "sagolar",
    "eyvallah",
    "teşekkürler",
    "tesekkurler",
    "teşekkür",
    "tesekkur",
    "harika",
    "süper",
    "super",
    "ja",
    "nein",
    "sí",
    "si",
    "oui",
    "non",
    "va bene",
    "d'accord",
    "تمام",
    "أوكي",
    "اوكي",
    "شكرا",
    "dale",
  ].map((s) => foldDiacritics(s)),
);

const EMOJI_OR_SYMBOL_ONLY = /^[\p{Emoji}\p{P}\p{S}\s0-9]+$/u;

export type ResolveActiveLocaleInput = {
  /** Explicit user instruction like "speak Turkish" / "Türkçe konuş". */
  explicitLocale?: string | null;
  /**
   * Detected message language — ignored for replies. Settings lock the language.
   */
  messageLocale?: string | null;
  /**
   * Ongoing chat language — ignored for replies. Settings lock the language.
   */
  conversationLocale?: string | null;
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
  const normalized = foldDiacritics(trimmed.replace(/[!?.…,]+$/g, "").trim());
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
 * Reply language follows Settings until the user changes it there.
 * Detected message language must not flip the coach.
 */
export function resolveActiveLocale(input: ResolveActiveLocaleInput): string {
  const fallback = (input.fallbackLocale || "en").trim() || "en";
  if (input.explicitLocale?.trim()) return input.explicitLocale.trim();
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
