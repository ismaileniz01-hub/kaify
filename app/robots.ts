import type { MetadataRoute } from "next";
import { seoCanonicalOrigin } from "@/lib/seo/origin";
import { SEO_DISALLOW_PREFIXES } from "@/lib/seo/policy";

export const dynamic = "force-static";

/**
 * AI search / assistant crawlers we explicitly welcome, so ChatGPT, Gemini,
 * Perplexity, Claude, Copilot and Apple Intelligence can read and cite the
 * public pages. They get the same private-area disallow list as everyone else.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Google-Extended",
  "Googlebot",
  "Bingbot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Applebot",
  "Applebot-Extended",
  "DuckAssistBot",
  "meta-externalagent",
] as const;

export default function robots(): MetadataRoute.Robots {
  const disallow = [...SEO_DISALLOW_PREFIXES];
  return {
    rules: [
      {
        userAgent: [...AI_CRAWLERS],
        allow: ["/", "/llms.txt"],
        disallow,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${seoCanonicalOrigin()}/sitemap.xml`,
    host: seoCanonicalOrigin(),
  };
}
