import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  SEO_DISALLOW_PREFIXES,
  SEO_INDEXABLE_PATHS,
  isProtectedProductPath,
  isSeoIndexablePath,
} from "@/lib/seo/policy";
import { seoAbsoluteUrl, seoCanonicalOrigin } from "@/lib/seo/origin";
import {
  SEO_HREFLANG_STRATEGY,
  SEO_PUBLIC_HTML_LANG,
} from "@/lib/i18n/reviewed-locales";
import { publicPageMetadata, rootMetadata } from "@/lib/seo/metadata";
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
    for (const url of urls) {
      expect(url.startsWith("https://kaifyai.org")).toBe(true);
      expect(url).not.toContain("/api/");
      expect(url).not.toContain("/welcome");
      expect(url).not.toContain("/chat");
      expect(url).not.toContain("?");
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
    expect(meta.openGraph?.siteName).toBe("K.AIFY");
    const twitter = meta.twitter as { card?: string } | undefined;
    expect(twitter?.card).toBe("summary_large_image");
  });

  it("classifies product vs public routes for guest gating", () => {
    expect(isProtectedProductPath("/welcome")).toBe(true);
    expect(isProtectedProductPath("/chat/kai")).toBe(true);
    expect(isProtectedProductPath("/pricing")).toBe(false);
    expect(isProtectedProductPath("/login")).toBe(false);
    expect(isProtectedProductPath("/")).toBe(false);
  });
});
