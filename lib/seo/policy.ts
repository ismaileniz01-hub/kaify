/**
 * Indexability contract. Authorization is NOT this file — robots is guidance only.
 *
 * Language lives in cookie/client preference; public URLs are not locale-prefixed.
 * Hreflang strategy: single canonical public language (English copy on static HTML).
 */

export const SEO_INDEXABLE_PATHS = [
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/cookies",
  "/kvkk",
] as const;

export type SeoIndexablePath = (typeof SEO_INDEXABLE_PATHS)[number];

export const SEO_PUBLIC_NOINDEX_PATHS = [
  "/login",
  "/login/mfa",
  "/signup",
] as const;

/** Prefixes search engines should not crawl (not a security control). */
export const SEO_DISALLOW_PREFIXES = [
  "/api/",
  "/admin/",
  "/welcome",
  "/chat",
  "/analytics",
  "/settings",
  "/leaderboard",
  "/market",
  "/myaccount",
  "/messages",
  "/streak",
  "/trophy-road",
  "/library",
  "/login",
  "/signup",
] as const;

export const PUBLIC_APP_PATHS = [
  "/login",
  "/login/mfa",
  "/signup",
  "/pricing",
] as const;

export function isSeoIndexablePath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (SEO_INDEXABLE_PATHS as readonly string[]).includes(path);
}

export function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/")
  );
}

export function isPublicAppPath(pathname: string): boolean {
  if (isPublicAuthPath(pathname)) return true;
  return pathname === "/pricing";
}

export function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return (
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/") ||
    pathname === "/terms" ||
    pathname.startsWith("/terms/") ||
    pathname === "/terms&conditions" ||
    pathname === "/cookies" ||
    pathname.startsWith("/cookies/") ||
    pathname === "/kvkk" ||
    pathname.startsWith("/kvkk/")
  );
}

/** Authenticated product UI — middleware may redirect guests. */
export function isProtectedProductPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  if (isMarketingPath(pathname)) return false;
  if (isPublicAppPath(pathname)) return false;
  if (pathname.startsWith("/_next/")) return false;
  return true;
}

export const SEO_CONTENT_DATES = {
  "/": "2026-08-14",
  "/pricing": "2026-08-14",
  "/privacy": "2026-07-05",
  "/terms": "2026-07-05",
  "/cookies": "2026-07-05",
  "/kvkk": "2026-07-05",
} as const;
