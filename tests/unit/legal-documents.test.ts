import { describe, expect, it } from "vitest";
import {
  COOKIES_VERSION,
  LEGAL_ENTITY,
  PADDLE_BUYER_TERMS_URL,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { TERMS_DOCUMENT } from "@/lib/legal/documents/terms";
import { TERMS_DOCUMENT_TR } from "@/lib/legal/documents/terms-tr";
import { PRIVACY_DOCUMENT } from "@/lib/legal/documents/privacy";
import { COOKIES_DOCUMENT } from "@/lib/legal/documents/cookies";
import { MEDICAL_DISCLAIMER_DOCUMENT } from "@/lib/legal/documents/medical-disclaimer";
import { SUBSCRIPTION_DISCLOSURES } from "@/lib/legal/subscription-disclosures";
import { SEO_INDEXABLE_PATHS } from "@/lib/seo/policy";
import { buildSitemap } from "@/lib/seo/sitemap";

describe("legal document pack v2", () => {
  it("bumps versions for re-consent", () => {
    expect(TERMS_VERSION).toBe("2.0.0");
    expect(PRIVACY_VERSION).toBe("2026-08-22");
    expect(COOKIES_VERSION).toBe("2026-08-21");
  });

  it("keeps English Terms as controlling with Paddle MoR and 16+", () => {
    const blob = JSON.stringify(TERMS_DOCUMENT);
    expect(blob).toContain(LEGAL_ENTITY);
    expect(blob).toContain("Merchant of Record");
    expect(blob).toContain("16");
    expect(blob).toContain(PADDLE_BUYER_TERMS_URL);
    expect(blob).toContain("LEGAL REVIEW REQUIRED");
    expect(blob).toMatch(/not a healthcare provider/i);
  });

  it("mirrors TR Terms section ids to English", () => {
    const enIds = TERMS_DOCUMENT.sections.map((s) => s.id);
    const trIds = TERMS_DOCUMENT_TR.sections.map((s) => s.id);
    expect(trIds).toEqual(enIds);
  });

  it("keeps Privacy global and lists only core subprocessors", () => {
    const blob = JSON.stringify(PRIVACY_DOCUMENT);
    expect(blob).toContain("Global English");
    expect(blob).toContain("independent controller");
    expect(blob).toContain("DeepSeek");
    expect(blob).toContain("Upstash");
    expect(blob).toContain("Türkiye");
    expect(blob).not.toContain("Turkey");
    expect(blob).not.toContain("veri sorumlusu");
    expect(blob).not.toContain("Sender.net");
    expect(blob).not.toContain("reCAPTCHA");
    expect(blob).not.toContain("Firebase");
    expect(blob).toContain("support@kaifyai.org");
    expect(blob).not.toContain("privacy@kaifyai.org");
  });

  it("documents cookie inventory essentials", () => {
    const blob = JSON.stringify(COOKIES_DOCUMENT);
    expect(blob).toContain("kaify_csrf");
    expect(blob).toContain("kaify_cookie_consent");
    expect(blob).toContain("Paddle Checkout");
  });

  it("publishes medical disclaimer and subscription short-form", () => {
    expect(MEDICAL_DISCLAIMER_DOCUMENT.title).toMatch(/Medical/i);
    expect(SUBSCRIPTION_DISCLOSURES.pricingNearCta.en).toMatch(/Paddle/);
    expect(SUBSCRIPTION_DISCLOSURES.paddleLinks.buyerTerms).toBe(
      PADDLE_BUYER_TERMS_URL,
    );
  });

  it("indexes /disclaimer in sitemap", () => {
    expect(SEO_INDEXABLE_PATHS).toContain("/disclaimer");
    const urls = buildSitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/disclaimer"))).toBe(true);
  });
});
