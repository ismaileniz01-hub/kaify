import type { LangCode } from "@/lib/lang-context-types";

export type ReviewedLangOption = {
  code: LangCode;
  label: string;
};

/**
 * Locales exposed in the language picker.
 * Only ship locales with substantial non-English coverage on product surfaces.
 * Dictionaries for other codes still ship for parity / future unlock.
 *
 * Wave 1 (UX-001): removed pt/nl/pl/ru/ko/zh-CN (~25% translated) and ja (~55%).
 * Kept TR + EN + DE/FR/ES(+variants)/IT/AR (~70%+ translated).
 */
export const REVIEWED_LANG_OPTIONS: ReviewedLangOption[] = [
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "en", label: "🇬🇧 English" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "es-mx", label: "🇲🇽 Español (México)" },
  { code: "es-ar", label: "🇦🇷 Español (Argentina)" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "ar", label: "🇸🇦 العربية" },
];

export const REVIEWED_LANG_CODES = REVIEWED_LANG_OPTIONS.map((o) => o.code);

/** Locales that must pass the corpus-quality gate when listed as reviewed. */
export const PRIORITY_QUALITY_LOCALES = [
  "de",
  "fr",
  "es",
  "it",
  "ar",
] as const;

/** Minimum share of non-admin keys that must differ from English. */
export const REVIEWED_LOCALE_MIN_TRANSLATED_RATIO = 0.55;
