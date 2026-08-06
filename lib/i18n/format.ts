import type { LangCode } from "@/lib/lang-context-types";

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

export function formatDate(
  value: string | number | Date,
  lang: LangCode,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(localeFor(lang), options);
}

export function formatTime(
  value: string | number | Date,
  lang: LangCode,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  return new Date(value).toLocaleTimeString(localeFor(lang), options);
}

export function formatDateTime(
  value: string | number | Date,
  lang: LangCode,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleString(localeFor(lang), options);
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
    return formatTime(date, lang);
  }
  if (diffHours < 48) return t("common.yesterday");
  return formatDate(date, lang, {
    weekday: "short",
    day: "numeric",
  });
}

export function formatRelativeShort(
  iso: string,
  lang: LangCode,
  t: LocaleTranslator,
  now = Date.now(),
): string {
  const diff = now - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return t("common.relative.now");
  if (min < 60) return t("common.relative.minutes", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("common.relative.hours", { count: hr });
  const day = Math.floor(hr / 24);
  if (day < 7) return t("common.relative.days", { count: day });
  return formatDate(iso, lang, { month: "short", day: "numeric" });
}
