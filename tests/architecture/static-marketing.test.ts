import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("marketing rendering (PERF-004 + F3-09 CSP)", () => {
  it("root layout metadata does not read cookies or headers", () => {
    const layout = src("app/layout.tsx");
    expect(layout).not.toContain("cookies(");
    expect(layout).not.toContain("headers(");
    expect(layout).toContain("export const metadata");
  });

  it("marketing layout stays static (no per-request headers/cookies/nonce)", () => {
    const layout = src("app/(marketing)/layout.tsx");
    expect(layout).not.toContain("headers(");
    expect(layout).not.toContain("x-nonce");
    expect(layout).not.toContain("cookies(");
  });

  it("landing components do not force a dynamic render", () => {
    expect(src("components/landing/LandingPage.tsx")).not.toContain("headers(");
    expect(src("components/seo/MarketingJsonLd.tsx")).not.toContain("headers(");
  });

  it("middleware sends the nonce-less policy for marketing paths only", () => {
    const mw = src("middleware.ts");
    expect(mw).toContain("isMarketingPath(pathname)");
    expect(mw).toContain("buildContentSecurityPolicy(nonce || null");
  });

  it("public legal pages do not call cookies()", () => {
    expect(src("app/(marketing)/privacy/page.tsx")).not.toContain("cookies(");
    expect(src("app/(marketing)/terms/page.tsx")).not.toContain("cookies(");
    expect(src("app/(marketing)/cookies/page.tsx")).not.toContain("cookies(");
  });
});
