import type { LangCode } from "@/lib/lang-context-types";

export type ReviewedLangOption = {
  code: LangCode;
  label: string;
};

/**
 * Locales exposed in the language picker after Phase 3 MT QA.
 * Dictionaries for other codes still ship for parity / future unlock.
 */
export const REVIEWED_LANG_OPTIONS: ReviewedLangOption[] = [
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "en", label: "🇬🇧 English" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "es-mx", label: "🇲🇽 Español (México)" },
  { code: "es-ar", label: "🇦🇷 Español (Argentina)" },
  { code: "pt", label: "🇵🇹 Português" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "nl", label: "🇳🇱 Nederlands" },
  { code: "pl", label: "🇵🇱 Polski" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "ar", label: "🇸🇦 العربية" },
  { code: "ja", label: "🇯🇵 日本語" },
  { code: "ko", label: "🇰🇷 한국어" },
  { code: "zh-CN", label: "🇨🇳 简体中文" },
];

export const REVIEWED_LANG_CODES = REVIEWED_LANG_OPTIONS.map((o) => o.code);

export const PRIORITY_QUALITY_LOCALES = [
  "de",
  "fr",
  "es",
  "pt",
  "ar",
  "ru",
  "ja",
  "zh-CN",
  "it",
  "nl",
  "pl",
  "ko",
] as const;
