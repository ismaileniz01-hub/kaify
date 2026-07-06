import { francAll } from "franc-min";
import {
  FALLBACK_LOCALE,
  resolveLocale,
  type SupportedLocale,
} from "@/lib/i18n/dictionary";

/** ISO 639-3 (franc-min) → Kaify locale. Unmapped codes are skipped. */
const FRANC_TO_LOCALE: Record<string, SupportedLocale> = {
  arb: "ar",
  azj: "az",
  bel: "be",
  bos: "bs",
  bul: "bg",
  ces: "cs",
  deu: "de",
  eng: "en",
  fra: "fr",
  hin: "hi",
  hrv: "hr",
  hun: "hu",
  ind: "id",
  ita: "it",
  kaz: "kk",
  nld: "nl",
  pes: "fa",
  pol: "pl",
  por: "pt",
  ron: "ro",
  rus: "ru",
  spa: "es",
  srp: "sr",
  swe: "sv",
  tur: "tr",
  ukr: "uk",
  urd: "ur",
  uzn: "uz",
  vie: "vi",
  yor: "yo",
  zlm: "ms",
  zyb: "zh-CN",
};

const HAS_LETTERS = /[\p{L}]/u;

/** Strip trailing punctuation so "broo..." still matches slang tokens. */
function normalizeForDetection(text: string): string {
  return text.trim().replace(/[.…!?,;:]+$/gu, "").trim();
}

/** Latin-script messages with no confident signal (slang, very short). */
function isAmbiguousShortMessage(text: string): boolean {
  const cleaned = normalizeForDetection(text);
  return cleaned.length > 0 && cleaned.length <= 24;
}

/** Global English gym/internet slang — often the whole message (e.g. "broo"). */
const ENGLISH_SLANG =
  /\b(bro{1,4}|bruh|dude|man|yeah|yep|nope|nah|lol|lmao|wtf|idk|tbh|ngl|sup|hey|hi|hello|ok|okay|cool|nice|thanks|thx|pls|please|yo|lets|let's|go|gym|workout|legday|push|pull|rest|day)\b/i;

function localeFromEnglishSlang(text: string): SupportedLocale | null {
  return ENGLISH_SLANG.test(normalizeForDetection(text)) ? "en" : null;
}
const WORD_HINTS: Array<{ locale: SupportedLocale; pattern: RegExp }> = [
  {
    locale: "en",
    pattern:
      /\b(the|and|you|your|what|how|hello|hi|thanks|please|today|eat|food|gym|workout|why|when|where|can|will|have|did|was|are|is)\b/i,
  },
  {
    locale: "de",
    pattern:
      /\b(ich|du|und|das|ist|nicht|was|wie|heute|essen|hallo|bitte|warum|wann|kann|habe|bist)\b/i,
  },
  {
    locale: "tr",
    pattern:
      /\b(ben|sen|ve|bir|bu|ne|nasıl|nasil|bugün|bugun|yemek|merhaba|lütfen|neden|için|var|yok|mı|mi|yedin)\b/i,
  },
  {
    locale: "fr",
    pattern:
      /\b(je|tu|et|le|la|est|pas|que|comment|bonjour|aujourd|manger|merci|pourquoi)\b/i,
  },
  {
    locale: "es",
    pattern:
      /\b(yo|tú|tu|el|la|es|qué|como|cómo|hola|hoy|comer|gracias|por)\b/i,
  },
];

function localeFromScript(text: string): SupportedLocale | null {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0590-\u05FF]/.test(text)) return "he";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0E00-\u0E7F]/.test(text)) return "th";
  if (/[\u3040-\u30FF]/.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh-CN";
  if (/[\u0370-\u03FF]/.test(text)) return "el";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  return null;
}

function countPatternHits(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  return [...text.matchAll(re)].length;
}

function localeFromWordHints(text: string): SupportedLocale | null {
  let best: { locale: SupportedLocale; hits: number } | null = null;

  for (const { locale, pattern } of WORD_HINTS) {
    const hits = countPatternHits(text, pattern);
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { locale, hits };
    }
  }

  return best?.locale ?? null;
}

function localeFromFranc(text: string): SupportedLocale | null {
  const candidates = francAll(text, { minLength: 3 });
  for (const [iso3, score] of candidates) {
    const mapped = FRANC_TO_LOCALE[iso3];
    if (mapped && score >= 0.5) return mapped;
  }
  return null;
}

function detectWithoutFallback(text: string): SupportedLocale | null {
  const cleaned = normalizeForDetection(text);
  if (!cleaned || !HAS_LETTERS.test(cleaned)) return null;

  return (
    localeFromScript(cleaned) ??
    localeFromEnglishSlang(cleaned) ??
    localeFromWordHints(cleaned) ??
    localeFromFranc(cleaned)
  );
}

/**
 * Best-effort locale for the user's latest chat message.
 * Falls back to profile/app locale when the text is too ambiguous.
 * Pass recent user turns so short replies like "broo" inherit the thread language.
 */
export function detectMessageLocale(
  text: string,
  profileLocale?: string | null,
  recentUserMessages: string[] = [],
): SupportedLocale {
  const fallback = resolveLocale(profileLocale ?? FALLBACK_LOCALE);
  const cleaned = normalizeForDetection(text);
  if (!cleaned || !HAS_LETTERS.test(cleaned)) return fallback;

  const direct = detectWithoutFallback(text);
  if (direct) return direct;

  if (isAmbiguousShortMessage(cleaned)) {
    for (let i = recentUserMessages.length - 1; i >= 0; i--) {
      const prior = detectWithoutFallback(recentUserMessages[i] ?? "");
      if (prior) return prior;
    }
  }

  return fallback;
}
