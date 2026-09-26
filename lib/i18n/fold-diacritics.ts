/**
 * Fold Latin diacritics / language-specific letters for matching.
 * Users often cannot type special keys (TR ı/ğ/ü/ş/ö/ç, DE ä/ö/ü/ß, FR é, …).
 * Coaches and routers should treat folded input as the same words.
 */

const TURKISH_LETTER_FOLD: Record<string, string> = {
  ı: "i",
  İ: "i",
  I: "i",
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ş: "s",
  Ş: "s",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
};

/**
 * Lowercase-ish Latin fold: strip combining marks + map common special letters.
 * Safe for intent/locale matching — not for display.
 */
export function foldDiacritics(text: string): string {
  const mapped = text.replace(
    /[ıİIğĞüÜşŞöÖçÇ]/g,
    (ch) => TURKISH_LETTER_FOLD[ch] ?? ch,
  );
  return mapped
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .replace(/ð/g, "d")
    .replace(/þ/gi, "th")
    .toLowerCase();
}

/** Normalize chat text for heuristic matching (trim + fold). */
export function foldChatMessage(text: string): string {
  return foldDiacritics(text.trim().replace(/\s+/g, " "));
}
