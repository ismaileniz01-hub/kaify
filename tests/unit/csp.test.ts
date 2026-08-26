import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, buildCspReportingEndpoints, generateCspNonce } from "@/lib/security/csp";

describe("buildContentSecurityPolicy", () => {
  const nonce = "test-nonce-123";
  const csp = buildContentSecurityPolicy(nonce);

  it("embeds the nonce in the script-src directive", () => {
    expect(csp).toContain(`'nonce-${nonce}'`);
  });

  it("includes core hardening directives", () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("allows service workers and manifest for PWA push", () => {
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("manifest-src 'self'");
  });

  it("allows blob media and workers for Web Speech API", () => {
    expect(csp).toContain("media-src 'self' blob:");
    expect(csp).toContain("https://*.google.com");
  });

  it("permits Supabase in connect-src", () => {
    expect(csp).toContain("https://*.supabase.co");
  });

  it("allows Termly on legal pages only", () => {
    const legal = buildContentSecurityPolicy(nonce, { legalEmbed: true });
    expect(legal).toContain("https://app.termly.io");
  });

  it("allows Paddle checkout CDN and API hosts", () => {
    expect(csp).toContain("https://cdn.paddle.com");
    expect(csp).toContain("https://buy.paddle.com");
    expect(csp).toContain("https://api.paddle.com");
  });

  it("marketing and app CSPs both require a nonce and omit script unsafe-inline", () => {
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("declares CSP reporting without weakening object-src", () => {
    expect(csp).toContain("report-uri /api/security/csp-report");
    expect(csp).toContain("report-to csp-endpoint");
    expect(csp).toContain("object-src 'none'");
    expect(buildCspReportingEndpoints()).toContain("/api/security/csp-report");
  });
});

describe("generateCspNonce", () => {
  it("produces non-empty, unique base64 values", () => {
    const a = generateCspNonce();
    const b = generateCspNonce();
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});
