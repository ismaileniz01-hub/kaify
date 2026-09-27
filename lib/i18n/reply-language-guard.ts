import { detectMessageLocale, looksLikeTurkishChat } from "@/lib/i18n/detect-message-locale";
import { resolveLocale, type SupportedLocale } from "@/lib/i18n/dictionary";

const MIN_LETTERS = 60;
const MIN_WORDS = 10;

/** Function words that mark an English sentence, not a lift name like "bench press". */
const ENGLISH_FUNCTION =
  /\b(the|and|you|your|this|that|with|from|what|when|where|they|their|them|have|was|were|aren't|don't|it's|because|before|after|those|these|just|also|only|most|same|keep|worth|against|otherwise|usually)\b/giu;

function englishFunctionHits(text: string): number {
  return [...text.matchAll(ENGLISH_FUNCTION)].length;
}

function baseLocale(locale: SupportedLocale): string {
  return locale.toLowerCase().split("-")[0] ?? locale.toLowerCase();
}

/**
 * Conservative output-language check. Short replies and data-heavy cards are
 * accepted because statistical language detection is unreliable there.
 */
export function isReplyLanguageMismatch(
  text: string,
  expectedLocale: string,
): boolean {
  const expected = resolveLocale(expectedLocale);
  const letters = [...text].filter((char) => /\p{L}/u.test(char)).length;
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  if (letters < MIN_LETTERS || words < MIN_WORDS) return false;
  // A Turkish word must not excuse a run of English sentences.
  if (expected === "tr" && looksLikeTurkishChat(text)) {
    return englishFunctionHits(text) >= 8;
  }

  const detected = detectMessageLocale(text, expected);
  return baseLocale(detected) !== baseLocale(expected);
}
