import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REFUND_DOCUMENT } from "@/lib/legal/documents/refund";
import { REFUND_DOCUMENT_TR } from "@/lib/legal/documents/refund-tr";
import { SEO_INDEXABLE_PATHS, isMarketingPath } from "@/lib/seo/policy";
import en from "@/lib/lang/en.json";
import tr from "@/lib/lang/tr.json";

const text = (doc: typeof REFUND_DOCUMENT) =>
  doc.sections
    .flatMap((s) => [s.title, ...s.blocks.flatMap((b) => (b.type === "p" ? [b.text] : b.items))])
    .join("\n");

describe("refund policy", () => {
  it("is a public, indexable legal page linked from the footer", () => {
    expect(SEO_INDEXABLE_PATHS).toContain("/refund");
    expect(isMarketingPath("/refund")).toBe(true);
    expect(readFileSync("components/landing/LandingFooter.tsx", "utf8")).toContain('href="/refund"');
  });

  it("states final sales but keeps the rights that cannot be waived (both languages)", () => {
    const enText = text(REFUND_DOCUMENT);
    const trText = text(REFUND_DOCUMENT_TR);
    expect(REFUND_DOCUMENT.sections.map((s) => s.id)).toEqual(REFUND_DOCUMENT_TR.sections.map((s) => s.id));
    expect(enText).toMatch(/non-refundable/);
    expect(enText).toMatch(/Article 15\(1\)\(ğ\)/);
    expect(enText).toMatch(/proportionate/);
    expect(enText).toMatch(/Nothing in this policy excludes or limits rights/);
    expect(enText).toMatch(/Paddle Refund Policy/);
    expect(trText).toMatch(/15\/1-ğ/);
    expect(trText).toMatch(/orantılı/);
    expect(trText).toMatch(/emredici tüketici mevzuatından doğan haklarınızı/);
  });

  it("checkout requires the immediate-performance acknowledgement and records it at Paddle", () => {
    const src = readFileSync("components/landing/PricingPage.tsx", "utf8");
    expect(src).toMatch(/if \(!consentGiven\) \{\s*setCheckoutError\(t\("pricing\.withdrawal_consent_required"\)\)/);
    expect(src).toMatch(/!planId \|\| openedPlan\.current \|\| !consentGiven/);
    expect(src.match(/withdrawal_waiver_at: new Date\(\)\.toISOString\(\)/g)?.length).toBe(2);
    expect(src).toContain('href="/refund"');
    for (const dict of [en, tr] as Record<string, string>[]) {
      expect(dict["pricing.withdrawal_consent"]).toBeTruthy();
      expect(dict["pricing.withdrawal_consent_required"]).toBeTruthy();
      expect(dict["legal.refund"]).toBeTruthy();
    }
  });
});
