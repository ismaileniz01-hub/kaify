import { detectMessageLocale, looksLikeTurkishChat } from "@/lib/i18n/detect-message-locale";
import { resolveLocale, type SupportedLocale } from "@/lib/i18n/dictionary";

const MIN_LETTERS = 60;
const MIN_WORDS = 10;

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
  if (expected === "tr" && looksLikeTurkishChat(text)) return false;

  const detected = detectMessageLocale(text, expected);
  return baseLocale(detected) !== baseLocale(expected);
}
