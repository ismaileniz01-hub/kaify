import type { MetadataRoute } from "next";
import { seoCanonicalOrigin } from "@/lib/seo/origin";
import { SEO_DISALLOW_PREFIXES } from "@/lib/seo/policy";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...SEO_DISALLOW_PREFIXES],
      },
    ],
    sitemap: `${seoCanonicalOrigin()}/sitemap.xml`,
    host: seoCanonicalOrigin(),
  };
}
