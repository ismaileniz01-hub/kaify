import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("marketing JSON-LD (SEO structured data)", () => {
  it("emits Organization, WebSite, and SoftwareApplication without fake ratings", () => {
    const src = readFileSync(
      join(process.cwd(), "components", "seo", "MarketingJsonLd.tsx"),
      "utf8",
    );
    expect(src).toContain('"@type": "Organization"');
    expect(src).toContain('"@type": "WebSite"');
    expect(src).toContain('"@type": "SoftwareApplication"');
    expect(src).toContain('price: "14.99"');
    expect(src).toContain('priceCurrency: "USD"');
    expect(src).not.toMatch(/aggregateRating|reviewRating|bestRating/);
  });
});
