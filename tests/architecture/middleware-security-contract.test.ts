import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const middleware = readFileSync(
  join(process.cwd(), "middleware.ts"),
  "utf8",
);
const authFallback = readFileSync(
  join(process.cwd(), "components", "auth", "AuthLoadingFallback.tsx"),
  "utf8",
);

describe("middleware security contracts", () => {
  it("forwards the same nonce-bearing CSP through the Next request and response", () => {
    expect(middleware).toContain(
      'requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)',
    );
    expect(middleware).toContain(
      'response.headers.set("Content-Security-Policy", contentSecurityPolicy)',
    );
    expect(middleware.indexOf("contentSecurityPolicy")).toBeLessThan(
      middleware.indexOf("new NextRequest"),
    );
    expect(middleware).not.toMatch(
      /response\.headers\.set\(\s*"Content-Security-Policy",\s*buildContentSecurityPolicy/,
    );
  });

  it("routes health probes through the dedicated limiter", () => {
    expect(middleware).toContain(
      'if (pathname === "/api/health") return "health"',
    );
    const limiter = middleware.indexOf("checkRateLimit(");
    const healthFinalize = middleware.indexOf(
      'pathname === "/api/health" ? { skipSessionRefresh: true }',
    );
    expect(limiter).toBeGreaterThan(0);
    expect(healthFinalize).toBeGreaterThan(limiter);
  });

  it("restricts native CORS to known shell origins", () => {
    expect(middleware).toContain("isNativeShellOrigin(origin)");
    expect(middleware).toContain('"Access-Control-Allow-Origin"');
    expect(middleware).toContain('request.method === "OPTIONS"');
    expect(middleware).toContain("NATIVE_CORS_ALLOW_HEADERS");
  });

  it("does not hang Android WebView on login Suspense fallback", () => {
    const loginPage = readFileSync(
      join(process.cwd(), "app", "(app)", "login", "(form)", "page.tsx"),
      "utf8",
    );
    const nativeEntry = readFileSync(
      join(process.cwd(), "app", "(app)", "login", "native-entry", "page.tsx"),
      "utf8",
    );
    const nativeEntryLoading = readFileSync(
      join(
        process.cwd(),
        "app",
        "(app)",
        "login",
        "native-entry",
        "loading.tsx",
      ),
      "utf8",
    );
    expect(loginPage).not.toContain('from "@/components/auth/AuthLoadingFallback"');
    expect(loginPage).not.toContain('from "next/navigation"');
    expect(loginPage).not.toContain("<Suspense");
    expect(nativeEntry).not.toContain('"use client"');
    expect(nativeEntry).toContain("x-nonce");
    expect(nativeEntry).toContain("NATIVE_ENTRY_BOOT_SCRIPT");
    expect(nativeEntryLoading).toContain("Kaify açılıyor");
    expect(nativeEntryLoading).not.toContain("premium-skeleton");
    expect(
      existsSync(
        join(process.cwd(), "app", "(app)", "login", "loading.tsx"),
      ),
    ).toBe(false);
  });

  it("gives auth pages a bounded, non-JS-only recovery fallback", () => {
    expect(authFallback).toContain("RECOVERY_MS = 8_000");
    expect(authFallback).toContain("<noscript>");
    expect(authFallback).toContain("Reload this page");
  });
});
