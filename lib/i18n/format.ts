import type { LangCode } from "@/lib/lang-context";

export type LocaleTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function localeFor(lang: LangCode): string {
  if (lang === "zh-CN") return "zh-CN";
  return lang;
}

export function formatNumber(
  value: number,
  lang: LangCode,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeFor(lang), options).format(value);
}

export function formatCurrency(
  value: number,
  lang: LangCode,
  currency = "USD",
): string {
  return new Intl.NumberFormat(localeFor(lang), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatInboxTime(
  iso: string,
  lang: LangCode,
  t: LocaleTranslator,
  now = new Date(),
): string {
  const date = new Date(iso);
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString(localeFor(lang), {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffHours < 48) return t("common.yesterday");
  return date.toLocaleDateString(localeFor(lang), {
    weekday: "short",
    day: "numeric",
  });
}
