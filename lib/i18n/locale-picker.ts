import type { LangCode } from "@/lib/lang-context-types";
import { SUPPORTED_LOCALES } from "@/lib/i18n/dictionary";

export type LocalePickerOption = {
  code: LangCode;
  /** Flag plus the language's own name. */
  label: string;
};

/**
 * Every shipped dictionary, with its flag. The settings picker uses this list.
 * Translation-quality gates stay on the smaller reviewed set.
 */
export const LOCALE_PICKER_OPTIONS: readonly LocalePickerOption[] = [
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "en", label: "🇬🇧 English" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "es-mx", label: "🇲🇽 Español (México)" },
  { code: "es-ar", label: "🇦🇷 Español (Argentina)" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "pt", label: "🇵🇹 Português" },
  { code: "nl", label: "🇳🇱 Nederlands" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "pl", label: "🇵🇱 Polski" },
  { code: "ro", label: "🇷🇴 Română" },
  { code: "el", label: "🇬🇷 Ελληνικά" },
  { code: "sv", label: "🇸🇪 Svenska" },
  { code: "cs", label: "🇨🇿 Čeština" },
  { code: "hu", label: "🇭🇺 Magyar" },
  { code: "uk", label: "🇺🇦 Українська" },
  { code: "da", label: "🇩🇰 Dansk" },
  { code: "no", label: "🇳🇴 Norsk" },
  { code: "fi", label: "🇫🇮 Suomi" },
  { code: "lt", label: "🇱🇹 Lietuvių" },
  { code: "lv", label: "🇱🇻 Latviešu" },
  { code: "et", label: "🇪🇪 Eesti" },
  { code: "sk", label: "🇸🇰 Slovenčina" },
  { code: "sl", label: "🇸🇮 Slovenščina" },
  { code: "hr", label: "🇭🇷 Hrvatski" },
  { code: "bg", label: "🇧🇬 Български" },
  { code: "sr", label: "🇷🇸 Српски" },
  { code: "is", label: "🇮🇸 Íslenska" },
  { code: "mt", label: "🇲🇹 Malti" },
  { code: "sq", label: "🇦🇱 Shqip" },
  { code: "bs", label: "🇧🇦 Bosanski" },
  { code: "mk", label: "🇲🇰 Македонски" },
  { code: "be", label: "🇧🇾 Беларуская" },
  { code: "lb", label: "🇱🇺 Lëtzebuergesch" },
  { code: "kk", label: "🇰🇿 Қазақша" },
  { code: "uz", label: "🇺🇿 Oʻzbekcha" },
  { code: "az", label: "🇦🇿 Azərbaycan" },
  { code: "ar", label: "🇸🇦 العربية" },
  { code: "he", label: "🇮🇱 עברית" },
  { code: "fa", label: "🇮🇷 فارسی" },
  { code: "ur", label: "🇵🇰 اردو" },
  { code: "af", label: "🇿🇦 Afrikaans" },
  { code: "yo", label: "🇳🇬 Yorùbá" },
  { code: "hi", label: "🇮🇳 हिन्दी" },
  { code: "zh-CN", label: "🇨🇳 中文" },
  { code: "ja", label: "🇯🇵 日本語" },
  { code: "ko", label: "🇰🇷 한국어" },
  { code: "vi", label: "🇻🇳 Tiếng Việt" },
  { code: "th", label: "🇹🇭 ไทย" },
  { code: "id", label: "🇮🇩 Bahasa Indonesia" },
  { code: "ms", label: "🇲🇾 Bahasa Melayu" },
  { code: "bn", label: "🇧🇩 বাংলা" },
];

const pickerCodes = LOCALE_PICKER_OPTIONS.map((option) => option.code);

if (
  pickerCodes.length !== SUPPORTED_LOCALES.length ||
  SUPPORTED_LOCALES.some((code) => !pickerCodes.includes(code))
) {
  throw new Error("Locale picker is missing a shipped dictionary");
}
