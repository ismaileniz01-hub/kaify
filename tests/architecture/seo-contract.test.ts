import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  SEO_CONTENT_DATES,
  SEO_DISALLOW_PREFIXES,
  SEO_INDEXABLE_PATHS,
  isProtectedProductPath,
  isSeoIndexablePath,
} from "@/lib/seo/policy";
import { seoAbsoluteUrl, seoCanonicalOrigin } from "@/lib/seo/origin";
import { SITEMAP_PAGE_META } from "@/lib/seo/sitemap";
import {
  SEO_HREFLANG_STRATEGY,
  SEO_PUBLIC_HTML_LANG,
} from "@/lib/i18n/reviewed-locales";
import { publicPageMetadata, rootMetadata } from "@/lib/seo/metadata";
import { TERMS_PATH } from "@/lib/legal/constants";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("SEO contract", () => {
  it("uses the production origin, never a preview host", () => {
    const origin = seoCanonicalOrigin();
    expect(origin).toBe("https://kaifyai.org");
    expect(origin).not.toMatch(/vercel\.app/);
  });

  it("robots lists the sitemap and disallows private prefixes", () => {
    const doc = robots();
    expect(doc.sitemap).toBe(`${seoCanonicalOrigin()}/sitemap.xml`);
    const disallow = Array.isArray(doc.rules)
      ? doc.rules.flatMap((r) => r.disallow ?? [])
      : [];
    for (const prefix of SEO_DISALLOW_PREFIXES) {
      expect(disallow).toContain(prefix);
    }
    expect(disallow.join(" ")).not.toMatch(/_next\/static/);
  });

  it("sitemap contains only canonical indexable URLs", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toEqual(SEO_INDEXABLE_PATHS.map((p) => seoAbsoluteUrl(p)));
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls[0]).toBe("https://kaifyai.org");
    for (const entry of entries) {
      expect(entry.url.startsWith("https://kaifyai.org")).toBe(true);
      expect(entry.url).not.toContain("/api/");
      expect(entry.url).not.toContain("/welcome");
      expect(entry.url).not.toContain("/chat");
      expect(entry.url).not.toContain("?");
      expect(entry.url).not.toContain("#");
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect(Number.isNaN((entry.lastModified as Date).getTime())).toBe(false);
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
      if (entry.url !== "https://kaifyai.org") {
        expect(entry.url.endsWith("/")).toBe(false);
      }
    }
  });

  it("sitemap meta covers every indexable path and no extras", () => {
    expect(Object.keys(SITEMAP_PAGE_META).sort()).toEqual(
      [...SEO_INDEXABLE_PATHS].sort(),
    );
    for (const path of SEO_INDEXABLE_PATHS) {
      expect(SITEMAP_PAGE_META[path].lastModified).toBe(SEO_CONTENT_DATES[path]);
    }
  });

  it("does not treat authenticated routes as indexable", () => {
    expect(isSeoIndexablePath("/welcome")).toBe(false);
    expect(isSeoIndexablePath("/chat/kai")).toBe(false);
    expect(isSeoIndexablePath("/login")).toBe(false);
    expect(isSeoIndexablePath("/")).toBe(true);
    expect(isSeoIndexablePath("/pricing")).toBe(true);
  });

  it("does not ship a competing public/index.html", () => {
    expect(existsSync(join(process.cwd(), "public", "index.html"))).toBe(false);
    expect(existsSync(join(process.cwd(), "native", "offline-index.html"))).toBe(
      true,
    );
  });

  it("uses Strategy B: one canonical public language, no fabricated hreflang", () => {
    expect(SEO_PUBLIC_HTML_LANG).toBe("en");
    expect(SEO_HREFLANG_STRATEGY).toBe("single_canonical_public_language");
    const metadataSrc = readFileSync(
      join(process.cwd(), "lib", "seo", "metadata.ts"),
      "utf8",
    );
    expect(metadataSrc).not.toContain("alternates: { languages");
    expect(publicPageMetadata({ title: "T", description: "D", path: "/" }).alternates).toEqual({
      canonical: "https://kaifyai.org",
    });
  });

  it("root metadata includes Open Graph and Twitter cards", () => {
    const meta = rootMetadata();
    expect(meta.metadataBase?.toString()).toBe("https://kaifyai.org/");
    expect(meta.openGraph?.siteName).toBe("Kaify Ai");
    const ogImages = meta.openGraph?.images;
    const firstOg = Array.isArray(ogImages) ? ogImages[0] : ogImages;
    expect(firstOg && typeof firstOg === "object" && "url" in firstOg ? firstOg.url : firstOg).toBe(
      "https://kaifyai.org/opengraph-image",
    );
    const twitter = meta.twitter as { card?: string } | undefined;
    expect(twitter?.card).toBe("summary_large_image");
  });

  it("classifies product vs public routes for guest gating", () => {
    expect(isProtectedProductPath("/welcome")).toBe(true);
    expect(isProtectedProductPath("/chat/kai")).toBe(true);
    expect(isProtectedProductPath("/pricing")).toBe(false);
    expect(isProtectedProductPath("/login")).toBe(false);
    expect(isProtectedProductPath("/")).toBe(false);
    expect(isProtectedProductPath("/opengraph-image")).toBe(false);
    expect(isProtectedProductPath("/robots.txt")).toBe(false);
  });

  it("canonical terms path is /terms, not the legacy alias", () => {
    expect(TERMS_PATH).toBe("/terms");
  });
});
