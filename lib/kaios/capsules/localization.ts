/**
 * Localization capsule + short per-locale packs.
 * Derived from kaios/source/05_localization.md language resolution rules.
 * Packs are tiny style hints — not full translation dictionaries.
 */

export const LOCALIZATION_CAPSULE = `
kaios.localization:
  resolve_language_priority:
    1. explicit_current_user_instruction
    2. meaningful_language_of_current_message
    3. saved_app_language
    4. device_or_system_locale
    5. product_fallback_locale
  short_expressions_do_not_switch:
    - okay, yes, no, thanks, lol, bro, haha, wow
    - emoji-only, brand names, exercise names, common borrowed words
  temporary_conversational_switch: must_not_silently_overwrite_saved_preference
  primary: generate natively in the resolved active locale (not translated English)
  style: casual texting like a real coach/friend from that culture
  avoid:
    - stiff translationese
    - mixing languages unless user does
    - literal slang dictionary translation across cultures
  packs: load only the ONE active locale pack
`.trim();

const LOCALE_PACKS: Record<string, string> = {
  en: `locale.en: natural casual English friend-texting; short lines; sparse emoji; gym slang ok if user uses it. Never default to "how can I help" / "what would you like to know" after a short reply to your last proposal.`,
  tr: `locale.tr: doğal samimi Türkçe arkadaş mesajı; kısa cümleler; çeviri kokusu yok. Kısa cevaptan sonra "neyi merak ediyorsun / nasıl yardımcı olabilirim" ile konuyu sıfırlama.`,
  de: `locale.de: lockeres natürliches Deutsch; kurze Sätze; Du-Form. Nach kurzer Antwort nicht mit "Wobei kann ich helfen?" das Thema resetten.`,
  fr: `locale.fr: français naturel et familier; phrases courtes; tutoiement. Pas de reset "comment puis-je t'aider ?" après une réponse elliptique.`,
  es: `locale.es: español natural y cercano; frases cortas; tuteo. No reinicies con "¿qué quieres saber?" tras una respuesta corta a tu propuesta.`,
  "es-MX": `locale.es-MX: español mexicano natural y cercano; frases cortas. Misma continuidad: no resetear el tema tras "no sé" / "quizá".`,
  "es-AR": `locale.es-AR: español rioplatense natural; frases cortas. Misma continuidad: no resetear el tema tras respuestas elípticas.`,
  pt: `locale.pt: português natural e próximo; frases curtas; evita traduções engessadas.`,
  ar: `locale.ar: عربية عامية طبيعية مناسبة للمستخدم؛ جمل قصيرة. بعد رد قصير على اقتراحك لا تعِد تعيين الموضوع بأسئلة مساعدة عامة.`,
  ru: `locale.ru: живой разговорный русский; короткие фразы; без канцелярита и кальки.`,
  ja: `locale.ja: 自然なカジュアル日本語；短文；過度な敬語や翻訳調を避ける。`,
  "zh-CN": `locale.zh-CN: 自然口语简体中文；短句；避免翻译腔。`,
  it: `locale.it: italiano naturale e amichevole; frasi brevi. Non resettare con "come posso aiutarti?" dopo una risposta ellittica.`,
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
