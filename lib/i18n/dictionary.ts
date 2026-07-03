/**
 * Locale dictionary loader — the single source of truth for translations,
 * usable from BOTH server (push copy, API messages) and any non-React caller.
 *
 * The flat `lib/lang/<code>.json` files power the UI; loading them here means
 * push notifications and server-rendered copy speak the exact same language as
 * the app, with English as the universal fallback for any missing key.
 */

/** All locale file codes that exist under `lib/lang/`. Keep in sync with LANG_OPTIONS. */
export const SUPPORTED_LOCALES = [
  "tr", "en", "de", "fr", "es", "es-mx", "es-ar", "it", "pt", "nl",
  "ru", "pl", "ro", "el", "sv", "cs", "hu", "uk", "da", "no",
  "fi", "lt", "lv", "et", "sk", "sl", "hr", "bg", "sr", "is",
  "mt", "sq", "bs", "mk", "be", "lb", "kk", "uz", "az",
  "ar", "he", "fa", "ur", "af", "yo",
  "hi", "zh-CN", "ja", "ko", "vi", "th", "id", "ms", "bn",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const FALLBACK_LOCALE: SupportedLocale = "en";

/**
 * Maps an arbitrary locale tag (e.g. "es-419", "PT-BR", "zh-Hant") to the best
 * available dictionary: exact match first, then the base language, else English.
 */
export function resolveLocale(input?: string | null): SupportedLocale {
  if (!input) return FALLBACK_LOCALE;
  const lower = input.trim().toLowerCase();
  if (!lower) return FALLBACK_LOCALE;

  const exact = SUPPORTED_LOCALES.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;

  const base = lower.split("-")[0];
  const baseMatch = SUPPORTED_LOCALES.find((c) => c.toLowerCase() === base);
  if (baseMatch) return baseMatch;

  return FALLBACK_LOCALE;
}

export type FlatDict = Record<string, string>;

const cache = new Map<SupportedLocale, FlatDict>();

/** Loads (and caches) a locale's flat translation dictionary. */
export async function loadDict(code: SupportedLocale): Promise<FlatDict> {
  const cached = cache.get(code);
  if (cached) return cached;

  const mod = (await import(`@/lib/lang/${code}.json`)) as { default: FlatDict };
  const dict = mod.default;
  cache.set(code, dict);
  return dict;
}

/**
 * Translates a flat key for the given locale, with English fallback and
 * `{placeholder}` interpolation. Returns the key itself when nothing is found.
 */
export async function translateKey(
  locale: string | null | undefined,
  key: string,
  params?: Record<string, unknown> | null,
): Promise<string> {
  const resolved = resolveLocale(locale);
  const dict = await loadDict(resolved);
  let text = dict[key];
  if (text === undefined && resolved !== FALLBACK_LOCALE) {
    const enDict = await loadDict(FALLBACK_LOCALE);
    text = enDict[key];
  }
  if (text === undefined) return key;
  return interpolate(text, params);
}

export function interpolate(
  text: string,
  params?: Record<string, unknown> | null,
): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}
