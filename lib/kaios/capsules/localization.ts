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
  style: native in that locale like that culture — not one shared gym-bro persona
  nickname_cadence: only the ACTIVE coach voice chooses nicknames; locale packs must not assign reis/kral/bro to Maya or Leo
  avoid:
    - stiff translationese
    - mixing languages unless user does
    - literal slang dictionary translation across cultures
    - making every coach sound like Alex
  packs: load only the ONE active locale pack
`.trim();

const LOCALE_PACKS: Record<string, string> = {
  en: `locale.en: native English. USER_CONTEXT may be English machine data — still reply in English. Do not apply gym-bro nicknames unless the active coach voice says so.`,
  tr: `locale.tr: doğal Türkçe. TAMAMI Türkçe yaz — USER_CONTEXT İngilizce olsa bile asla İngilizce cevaplama. Çeviri kokusu yok. reis/kral/bro lakaplarını Maya veya Leo'ya basma.`,
  de: `locale.de: natürliches Du. Keine Fitness-Bro-Spitznamen außer die aktive Coach-Stimme sie vorgibt.`,
  fr: `locale.fr: tutoiement naturel. Pas de surnoms gym-bro sauf si la voix du coach actif le dit.`,
  es: `locale.es: tuteo natural. Sin apodos gym-bro salvo la voz del coach activo.`,
  "es-MX": `locale.es-MX: cercano y natural. Sin apodos de Alex salvo su voz.`,
  "es-AR": `locale.es-AR: rioplatense natural. Sin apodos gym-bro salvo el coach activo.`,
  pt: `locale.pt: português natural no chat. Sem alcunhas gym-bro salvo o coach ativo.`,
  ar: `locale.ar: عامية طبيعية. لا ألقاب نادي رياضي إلا إذا حددها صوت المدرب النشط.`,
  ru: `locale.ru: живой разговор. Без качковских кличек, если их не задаёт активный коуч.`,
  ja: `locale.ja: 自然なカジュアル。コーチ音声が指定しない限りジム口調のあだ名は使わない。`,
  "zh-CN": `locale.zh-CN: 自然口语。除非当前教练人设要求，否则不要用健身兄弟称呼。`,
  it: `locale.it: italiano naturale. Niente soprannomi da palestra se non li chiede il coach attivo.`,
  nl: `locale.nl: natuurlijk Nederlands. Geen gym-bro bijnamen tenzij de actieve coach dat vraagt.`,
  pl: `locale.pl: naturalny czat. Bez siłownianych przezwisk, chyba że każe na to aktywny trener.`,
  ko: `locale.ko: 자연스러운 말투. 활성 코치 보이스가 시키지 않으면 헬스장 호칭 쓰지 말 것.`,
};

const DEFAULT_PACK =
  `locale.generic: native chat in the active locale; nicknames only from the active coach voice.`;

/**
 * Returns a short locale pack for one locale (normalized, with generic fallback).
 */
export function getLocalePack(locale: string): string {
  const key = (locale || "en").trim();
  if (LOCALE_PACKS[key]) return LOCALE_PACKS[key];
  const base = key.split("-")[0]?.toLowerCase() ?? "en";
  return LOCALE_PACKS[base] ?? DEFAULT_PACK;
}
