import type { MetadataRoute } from "next";
import { seoAbsoluteUrl } from "@/lib/seo/origin";
import { SEO_CONTENT_DATES, SEO_INDEXABLE_PATHS } from "@/lib/seo/policy";

export default function sitemap(): MetadataRoute.Sitemap {
  return SEO_INDEXABLE_PATHS.map((path) => ({
    url: seoAbsoluteUrl(path),
    lastModified: new Date(SEO_CONTENT_DATES[path]),
    changeFrequency: path === "/" || path === "/pricing" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/pricing" ? 0.9 : 0.5,
  }));
}
