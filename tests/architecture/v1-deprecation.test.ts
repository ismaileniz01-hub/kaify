import { describe, expect, it } from "vitest";
import { isLegacyPublicApi, legacyApiDeprecationHeaders } from "@/lib/api/v1-manifest";

describe("legacy API deprecation", () => {
  it("marks user-facing legacy paths as deprecated", () => {
    expect(isLegacyPublicApi("/api/profile")).toBe(true);
    expect(isLegacyPublicApi("/api/market/purchase")).toBe(true);
  });

  it("excludes v1, cron, admin, and webhooks", () => {
    expect(isLegacyPublicApi("/api/v1/profile")).toBe(false);
    expect(isLegacyPublicApi("/api/cron/cleanup")).toBe(false);
    expect(isLegacyPublicApi("/api/admin/overview")).toBe(false);
    expect(isLegacyPublicApi("/api/webhooks/paddle")).toBe(false);
  });

  it("provides Sunset and Deprecation headers", () => {
    const headers = legacyApiDeprecationHeaders();
    expect(headers.Deprecation).toBe("true");
    expect(headers.Sunset).toContain("2027");
    expect(headers.Link).toContain("/api/v1");
  });
});
