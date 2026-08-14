import type { MetadataRoute } from "next";
import { buildSitemap } from "@/lib/seo/sitemap";

/** Google/Bing sitemap at /sitemap.xml — indexable canonicals only. */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
