/**
 * Localization capsule + short per-locale packs.
 * Packs are tiny style hints — not full translation dictionaries.
 */

export const LOCALIZATION_CAPSULE = `
kaios.localization:
  primary: match language of user's latest message (native, not translated English)
  fallback_app_locale: only when message has no clear language (emoji/numbers/empty)
  style: casual texting like a real coach/friend from that culture
  avoid:
    - stiff translationese
    - mixing languages unless user does
    - English filler when user wrote another language
  packs: load only the active locale pack below when provided
`.trim();

const LOCALE_PACKS: Record<string, string> = {
  en: `locale.en: natural casual English; short lines; sparse emoji; gym slang ok if user uses it.`,
  tr: `locale.tr: doğal samimi Türkçe; kısa cümleler; çeviri kokusu yok; spor jargonu kullanıcıya uy.`,
  de: `locale.de: lockeres natürliches Deutsch; kurze Sätze; kein Übersetzungsdeutsch; Du-Form.`,
  fr: `locale.fr: français naturel et familier; phrases courtes; tutoiement; pas de traduction figée.`,
  es: `locale.es: español natural y cercano; frases cortas; tuteo; evita calcos del inglés.`,
  pt: `locale.pt: português natural e próximo; frases curtas; evita traduções engessadas.`,
  ar: `locale.ar: عربية عامية طبيعية مناسبة للمستخدم؛ جمل قصيرة؛ بلا ترجمة حرفية.`,
  ru: `locale.ru: живой разговорный русский; короткие фразы; без канцелярита и кальки.`,
  ja: `locale.ja: 自然なカジュアル日本語；短文；過度な敬語や翻訳調を避ける。`,
  "zh-CN": `locale.zh-CN: 自然口语简体中文；短句；避免翻译腔。`,
  it: `locale.it: italiano naturale e amichevole; frasi brevi; evita il tono da traduzione.`,
  nl: `locale.nl: natuurlijk informeel Nederlands; korte zinnen; geen vertaalde stijfheid.`,
  pl: `locale.pl: naturalny swobodny polski; krótkie zdania; bez sztywnego tłumaczenia.`,
  ko: `locale.ko: 자연스러운 캐주얼 한국어; 짧은 문장; 번역투 피하기.`,
};

const DEFAULT_PACK =
  `locale.generic: reply fully in the user's language; sound native; short casual lines; sparse emoji.`;

/**
 * Returns a short locale pack for one locale (normalized, with generic fallback).
 */
export function getLocalePack(locale: string): string {
  const key = (locale || "en").trim();
  if (LOCALE_PACKS[key]) return LOCALE_PACKS[key];
  const base = key.split("-")[0]?.toLowerCase() ?? "en";
  return LOCALE_PACKS[base] ?? DEFAULT_PACK;
}
