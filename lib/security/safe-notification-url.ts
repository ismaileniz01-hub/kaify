/**
 * Resolves a push-notification click URL to a same-origin app path.
 * Never trust notification payload content — reject cross-origin and
 * dangerous schemes, fall back to the app root on anything unsafe.
 *
 * Mirrored in `public/sw.js` (service workers cannot import this module).
 * Keep both implementations in sync; tests cover this module.
 */

export const SAFE_NOTIFICATION_FALLBACK = "/welcome";

/**
 * Returns a same-origin path+search+hash safe for `clients.openWindow` /
 * `client.navigate`, or the fallback when the candidate is missing/unsafe.
 */
export function resolveSafeNotificationUrl(
  candidate: unknown,
  origin: string = typeof self !== "undefined" && "location" in self
    ? self.location.origin
    : "https://kaifyai.org",
): string {
  if (candidate == null) return SAFE_NOTIFICATION_FALLBACK;
  if (typeof candidate !== "string") return SAFE_NOTIFICATION_FALLBACK;

  const trimmed = candidate.trim();
  if (!trimmed) return SAFE_NOTIFICATION_FALLBACK;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("blob:")
  ) {
    return SAFE_NOTIFICATION_FALLBACK;
  }

  // Protocol-relative URLs resolve against the current origin's scheme but
  // can still point at a foreign host — reject unless host matches.
  try {
    const base = origin.endsWith("/") ? origin : `${origin}/`;
    const resolved = trimmed.startsWith("/")
      ? new URL(trimmed, base)
      : new URL(trimmed, base);

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return SAFE_NOTIFICATION_FALLBACK;
    }

    const allowed = new URL(base);
    if (resolved.origin !== allowed.origin) {
      return SAFE_NOTIFICATION_FALLBACK;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}` || SAFE_NOTIFICATION_FALLBACK;
  } catch {
    return SAFE_NOTIFICATION_FALLBACK;
  }
}
