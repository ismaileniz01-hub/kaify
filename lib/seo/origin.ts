import { CANONICAL_APP_URL } from "@/lib/app-url";

const PREVIEW_HOST =
  /vercel\.app$|localhost$|^127\.0\.0\.1$|^0\.0\.0\.0$|\.local$/i;

/**
 * Origin used in canonical URLs, sitemap, and robots.
 * Preview / local hosts never become indexed canonicals.
 */
export function seoCanonicalOrigin(): string {
  const candidates = [
    process.env.SEO_CANONICAL_ORIGIN,
    process.env.NEXT_PUBLIC_SEO_ORIGIN,
  ];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      const url = new URL(value.includes("://") ? value : `https://${value}`);
      if (url.protocol !== "https:") continue;
      if (PREVIEW_HOST.test(url.hostname)) continue;
      return url.origin;
    } catch {
      continue;
    }
  }
  return CANONICAL_APP_URL.replace(/\/$/, "");
}

export function seoAbsoluteUrl(path: string): string {
  const origin = seoCanonicalOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return origin;
  return `${origin}${normalized.replace(/\/+$/, "")}`;
}
