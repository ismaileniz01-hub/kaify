/** Browser-safe CSRF helpers (no Node crypto / next/headers). */

export const CSRF_COOKIE_NAME = "kaify_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

/** Read CSRF cookie value for API headers (double-submit pattern). */
export function readCsrfCookieFromDocument(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1));
}
