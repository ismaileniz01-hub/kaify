/**
 * Server-side rendering of notification copy for Web Push / FCM payloads.
 *
 * In-app notifications are rendered client-side from i18n keys, but a push
 * payload must contain final text (the service worker has no i18n context).
 *
 * Copy is loaded from the SAME `lib/lang/<locale>.json` files as the UI via
 * the shared dictionary loader, so a push notification is always in the user's
 * language (all supported locales), with English fallback for missing keys.
 */

import {
  interpolate,
  loadDict,
  resolveLocale,
  FALLBACK_LOCALE,
} from "@/lib/i18n/dictionary";

type Copy = { title: string; body: string };

/**
 * Renders push title/body. Prefers key-based copy (`<titleKey>.title` /
 * `<titleKey>.body`) from the locale dictionary; falls back to free-text
 * title/body (e.g. AI-generated) when no key matches.
 */
export async function renderPushCopy(input: {
  titleKey?: string | null;
  bodyKey?: string | null;
  title?: string | null;
  body?: string | null;
  params?: Record<string, unknown> | null;
  locale?: string | null;
}): Promise<Copy | null> {
  const resolved = resolveLocale(input.locale);
  const dict = await loadDict(resolved);
  const enDict =
    resolved === FALLBACK_LOCALE ? dict : await loadDict(FALLBACK_LOCALE);

  const lookup = (key: string): string | undefined => dict[key] ?? enDict[key];

  const titleTpl = input.titleKey ? lookup(`${input.titleKey}.title`) : undefined;
  const bodyTpl = input.titleKey ? lookup(`${input.titleKey}.body`) : undefined;

  const title =
    titleTpl !== undefined
      ? interpolate(titleTpl, input.params)
      : input.title ?? null;
  const body =
    bodyTpl !== undefined
      ? interpolate(bodyTpl, input.params)
      : input.body ?? "";

  if (!title) return null;
  return { title, body };
}
