import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, generateCspNonce } from "@/lib/security/csp";

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
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("manifest-src 'self'");
  });

  it("permits Supabase in connect-src", () => {
    expect(csp).toContain("https://*.supabase.co");
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
