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
  en: `locale.en: buddy texting. nicknames (rotate, sparse): bro / king / champ. Native English, short lines, light tease. No help-desk reset after a short reply.`,
  tr: `locale.tr: kanka ağzı, çeviri kokusu yok. lakap (seyrek, döndür): reis / kral / başkan. Şaka hafif. Konuyu "neyi merak ediyorsun" ile sıfırlama. Cümleleri bitir.`,
  de: `locale.de: Kumpel-Du. Spitznamen (sparsam): Alter / Chef / Champion. Natürliches Deutsch. Kein "Wobei kann ich helfen?" nach kurzer Antwort.`,
  fr: `locale.fr: pote, tutoiement. surnoms (peu): mec / chef / champion. Pas de reset "comment puis-je t'aider ?" après une réponse elliptique.`,
  es: `locale.es: colega, tuteo. apodos (pocos): crack / jefe / campeón. No reinicies con "¿qué quieres saber?".`,
  "es-MX": `locale.es-MX: cercano. apodos (pocos): wey / jefe / crack. Continuidad tras "no sé".`,
  "es-AR": `locale.es-AR: rioplatense. apodos (pocos): che / capo / crack. Continuidad tras respuestas elípticas.`,
  pt: `locale.pt: mano no chat. alcunhas (poucas): mano / chefia / campeão. Sem tradução engessada.`,
  ar: `locale.ar: عامية قريبة. ألقاب خفيفة (قليلة): يا كبير / يا وحش / يا بطل. لا تعِد تعيين الموضوع بعد رد قصير.`,
  ru: `locale.ru: свой в переписке. обращения (редко): брат / чемпион / шеф. Без канцелярита.`,
  ja: `locale.ja: カジュアル。呼びかけは控えめに 相棒 / チャンピオン。翻訳調・過剰な敬語なし。`,
  "zh-CN": `locale.zh-CN: 口语兄弟感。称呼（少用）：兄弟 / 大哥 / 冠军。避免翻译腔。`,
  it: `locale.it: amico in chat. soprannomi (pochi): capo / campioncino / bro. Niente "come posso aiutarti?" dopo replica ellittica.`,
  nl: `locale.nl: maatje. bijnamen (spaarzaam): maat / kampioen / baas. Geen vertaalde stijfheid.`,
  pl: `locale.pl: kumpel. przezwiska (rzadko): stary / szefie / mistrzu. Bez sztywnego tłumaczenia.`,
  ko: `locale.ko: 캐주얼 친구. 호칭(가끔): 챔프 / 형. 번역투 없이.`,
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
