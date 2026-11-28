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
  "/refund",
  "/cookies",
  "/kvkk",
  "/disclaimer",
  "/delete-account",
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
    pathname.startsWith("/signup/") ||
    pathname === "/auth/social-complete" ||
    pathname.startsWith("/auth/social-complete/")
  );
}

export function isPublicAppPath(pathname: string): boolean {
  if (isPublicAuthPath(pathname)) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return pathname === "/pricing";
}

export function isAssociationPath(pathname: string): boolean {
  return (
    pathname === "/.well-known/assetlinks.json" ||
    pathname === "/.well-known/apple-app-site-association"
  );
}

export function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/pricing") return true;
  if (
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/llms.txt"
  ) {
    return true;
  }
  return (
    pathname === "/privacy" ||
    pathname.startsWith("/privacy/") ||
    pathname === "/terms" ||
    pathname.startsWith("/terms/") ||
    pathname === "/terms&conditions" ||
    pathname === "/refund" ||
    pathname === "/cookies" ||
    pathname.startsWith("/cookies/") ||
    pathname === "/kvkk" ||
    pathname.startsWith("/kvkk/") ||
    pathname === "/disclaimer" ||
    pathname.startsWith("/disclaimer/") ||
    pathname === "/delete-account" ||
    pathname.startsWith("/delete-account/")
  );
}

/** Authenticated product UI — middleware may redirect guests. */
export function isProtectedProductPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  if (isAssociationPath(pathname)) return false;
  if (isMarketingPath(pathname)) return false;
  if (isPublicAppPath(pathname)) return false;
  if (pathname.startsWith("/_next/")) return false;
  if (
    pathname === "/opengraph-image" ||
    pathname.startsWith("/opengraph-image/") ||
    pathname === "/twitter-image" ||
    pathname.startsWith("/twitter-image/") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  ) {
    return false;
  }
  return true;
}

export const SEO_CONTENT_DATES = {
  "/": "2026-08-14",
  "/pricing": "2026-08-21",
  "/privacy": "2026-08-22",
  "/terms": "2026-08-21",
  "/refund": "2026-11-28",
  "/cookies": "2026-08-21",
  "/kvkk": "2026-08-21",
  "/disclaimer": "2026-08-21",
  "/delete-account": "2026-08-22",
} as const;
