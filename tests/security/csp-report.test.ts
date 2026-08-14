import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CSP_REPORT_MAX_BYTES,
  parseCspReportBody,
  redactReportUrl,
  sanitizeCspReport,
} from "@/lib/security/csp-report";

describe("CSP report sanitizer", () => {
  it("accepts a valid report-uri body and redacts query secrets", () => {
    const parsed = parseCspReportBody(
      JSON.stringify({
        "csp-report": {
          "document-uri": "https://kaify.org/welcome?token=supersecret&ok=1",
          "blocked-uri": "https://evil.example/x?email=a@b.com",
          "effective-directive": "script-src",
          disposition: "enforce",
        },
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.report.directive).toBe("script-src");
    expect(parsed.report.documentUrl).toContain("[redacted]");
    expect(parsed.report.documentUrl).not.toContain("supersecret");
    expect(parsed.report.blockedUrl).not.toContain("a@b.com");
  });

  it("accepts Reporting API csp-violation arrays", () => {
    const report = sanitizeCspReport([
      {
        type: "csp-violation",
        body: {
          documentURL: "https://kaify.org/",
          blockedURL: "inline",
          effectiveDirective: "style-src",
        },
      },
    ]);
    expect(report?.directive).toBe("style-src");
  });

  it("fails closed on malformed JSON", () => {
    expect(parseCspReportBody("not-json").ok).toBe(false);
    expect(parseCspReportBody("{}").ok).toBe(false);
  });

  it("rejects oversized bodies", () => {
    const huge = JSON.stringify({
      "csp-report": { "document-uri": "https://kaify.org/", "effective-directive": "x".repeat(CSP_REPORT_MAX_BYTES) },
    });
    expect(parseCspReportBody(huge)).toEqual({ ok: false, reason: "oversized" });
  });

  it("does not keep raw document sample / injection payloads", () => {
    const report = sanitizeCspReport({
      "csp-report": {
        "document-uri": "https://kaify.org/",
        "effective-directive": "script-src",
        sample: "<script>alert(1)</script>",
      },
    });
    expect(JSON.stringify(report)).not.toContain("alert(1)");
  });

  it("redacts sensitive query keys in URLs", () => {
    expect(redactReportUrl("https://kaify.org/cb?code=abc&x=1")).toContain("[redacted]");
  });
});

describe("CSP report route wiring", () => {
  it("uses defineRouteRaw with public rate limit and no CSRF", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/security/csp-report/route.ts"),
      "utf8",
    );
    expect(src).toContain('publicRateLimit: "csp_report"');
    expect(src).toContain("requireCsrf: false");
    expect(src).toContain("auth: \"none\"");
  });

  it("middleware exempts the report path from origin and bot blocks", () => {
    const src = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
    expect(src).toContain("CSP_REPORT_PATH");
    expect(src).toContain("buildCspReportingEndpoints");
  });
});
