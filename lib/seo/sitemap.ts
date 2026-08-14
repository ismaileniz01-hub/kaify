import type { MetadataRoute } from "next";
import {
  COOKIES_VERSION,
  PRIVACY_VERSION,
} from "@/lib/legal/constants";
import { seoAbsoluteUrl } from "@/lib/seo/origin";
import {
  SEO_INDEXABLE_PATHS,
  type SeoIndexablePath,
} from "@/lib/seo/policy";

type SitemapMeta = {
  lastModified: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

/**
 * Per-URL sitemap hints. lastmod must be a real content date (YYYY-MM-DD).
 * Do not list noindex, auth, API, redirect aliases, or locale-prefixed URLs.
 */
export const SITEMAP_PAGE_META: Record<SeoIndexablePath, SitemapMeta> = {
  "/": {
    lastModified: "2026-08-14",
    changeFrequency: "weekly",
    priority: 1,
  },
  "/pricing": {
    lastModified: "2026-08-14",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/privacy": {
    lastModified: PRIVACY_VERSION,
    changeFrequency: "monthly",
    priority: 0.5,
  },
  "/terms": {
    lastModified: "2026-07-05",
    changeFrequency: "monthly",
    priority: 0.5,
  },
  "/cookies": {
    lastModified: COOKIES_VERSION,
    changeFrequency: "monthly",
    priority: 0.5,
  },
  "/kvkk": {
    lastModified: "2026-07-05",
    changeFrequency: "monthly",
    priority: 0.5,
  },
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function sitemapLastModified(isoDay: string): Date {
  if (!DAY.test(isoDay)) {
    throw new Error(`Sitemap lastmod must be YYYY-MM-DD, got ${isoDay}`);
  }
  return new Date(`${isoDay}T00:00:00.000Z`);
}

export function buildSitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return SEO_INDEXABLE_PATHS.map((path) => {
    const meta = SITEMAP_PAGE_META[path];
    const url = seoAbsoluteUrl(path);
    if (seen.has(url)) {
      throw new Error(`Duplicate sitemap loc: ${url}`);
    }
    seen.add(url);
    if (!url.startsWith("https://")) {
      throw new Error(`Sitemap loc must be https: ${url}`);
    }
    if (url.includes("?") || url.includes("#")) {
      throw new Error(`Sitemap loc must be canonical without query/hash: ${url}`);
    }
    if (path !== "/" && url.endsWith("/")) {
      throw new Error(`Sitemap loc must not use a trailing slash: ${url}`);
    }
    return {
      url,
      lastModified: sitemapLastModified(meta.lastModified),
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });
}
