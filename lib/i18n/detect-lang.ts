import type { LangCode } from "@/lib/lang-context-types";
import { REVIEWED_LANG_CODES } from "@/lib/i18n/reviewed-locales";

const PLACEHOLDER_COPY = new Set(["", "UNSUPPORTED_LANG"]);

export function isPlaceholderCopy(value: string | undefined): boolean {
  if (value === undefined) return true;
  return PLACEHOLDER_COPY.has(value.trim());
}

export function normalizeLangTag(raw: string): string {
  return raw.trim().replaceAll("_", "-").toLowerCase();
}

/**
 * Map device / Accept-Language tags onto shipped picker locales.
 * Stored user choice is applied separately and always wins.
 */
export function detectLangFromTags(
  languages: readonly string[],
  allowed: readonly string[] = REVIEWED_LANG_CODES,
): LangCode {
  const allow = new Set(allowed.map((code) => code.toLowerCase()));

  for (const raw of languages) {
    if (!raw?.trim()) continue;
    const tag = normalizeLangTag(raw);
    if (allow.has(tag)) return tag as LangCode;

    const prefix = tag.split("-")[0] ?? "";
    if (prefix && allow.has(prefix)) return prefix as LangCode;

    const regional = allowed.find((code) => code.toLowerCase().startsWith(`${prefix}-`));
    if (regional) return regional as LangCode;
  }

  return "en";
}

export function detectLangFromNavigator(
  languages?: readonly string[],
): LangCode {
  const list =
    languages ??
    (typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : navigator.language
          ? [navigator.language]
          : []);
  return detectLangFromTags(list);
}

export function otpLocaleForLang(lang: LangCode): "tr" | "en" {
  return lang === "tr" ? "tr" : "en";
}
