import { FALLBACK_LOCALE, resolveLocale, type SupportedLocale } from "@/lib/i18n/dictionary";
import { QUOTES_BY_LOCALE } from "@/lib/motivation-quotes/catalog";

export const MOTIVATION_QUOTE_COUNT = QUOTES_BY_LOCALE.en.length;

function dayOfYearUtc(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86_400_000);
}

/** Stable daily index (0 … count-1) from UTC date. */
export function dailyQuoteIndex(date: Date = new Date(), count = MOTIVATION_QUOTE_COUNT): number {
  return dayOfYearUtc(date) % count;
}

function quotesFor(locale: SupportedLocale): readonly string[] {
  return QUOTES_BY_LOCALE[locale] ?? QUOTES_BY_LOCALE[FALLBACK_LOCALE];
}

/** Returns today's motivational quote in the user's locale (max ~15 words + author). */
export function getDailyMotivationQuoteSync(
  locale: string | null | undefined,
  date: Date = new Date(),
): string {
  const resolved = resolveLocale(locale);
  const quotes = quotesFor(resolved);
  if (quotes.length === 0) return "";
  const idx = dailyQuoteIndex(date, quotes.length);
  return quotes[idx] ?? quotes[0] ?? "";
}

/** Async alias for server callers. */
export async function getDailyMotivationQuote(
  locale: string | null | undefined,
  date: Date = new Date(),
): Promise<string> {
  return getDailyMotivationQuoteSync(locale, date);
}
