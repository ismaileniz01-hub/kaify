import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("native local packaging contract", () => {
  const capacitor = source("capacitor.config.ts");
  const capSync = source("scripts/cap-sync.mjs");
  const packageJson = JSON.parse(source("package.json")) as {
    scripts: Record<string, string>;
  };
  const nativeApp = source("native-app/src/App.tsx");
  const nativeApi = source("native-app/src/api.ts");
  const nativeSession = source("native-app/src/session.ts");
  const serverAuth = source("lib/supabase/server.ts");
  const webview = source("lib/native/webview-request.ts");

  it("packages native-dist by default and only allowlists test remote WebView", () => {
    expect(capacitor).toContain('webDir: "native-dist"');
    expect(capacitor).toContain("ALLOWED_TEST_WEBVIEW_URLS");
    expect(capacitor).toContain("https://kaifyai.org");
    expect(capacitor).not.toContain("https://kaifyai.org/login");
    // Default store path still omits server unless CAPACITOR_SERVER_URL is set.
    expect(capacitor).toContain("resolveCapacitorServerUrl");
    expect(capSync).toContain("ALLOWED_TEST_WEBVIEW_URLS");
    expect(packageJson.scripts["cap:sync:test-web"]).toContain(
      "https://kaifyai.org",
    );
    expect(packageJson.scripts["cap:sync:prod"]).toBe("node scripts/cap-sync.mjs");
  });

  it("keeps required acquisition and coaching examples in the local UI", () => {
    for (const screen of ["login", "signup", "plan", "welcome", "chat"]) {
      expect(nativeApp).toContain(`"${screen}"`);
    }
    expect(nativeApp).toContain('from "@/lib/marketing/pricing-plans"');
    expect(nativeApp).toContain("shouldCreateUser");
  });

  it("locks coaching before payment on both navigation and send", () => {
    expect(nativeApp.match(/profileHasPaidAccess/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(nativeApi).toContain("active subscription is required");
  });

  it("uses secure native session storage and bearer API authentication", () => {
    expect(nativeSession).toContain("SecureStorage");
    expect(nativeSession).toContain("persistSession: true");
    expect(nativeApi).toContain('"Authorization"');
    expect(nativeApi).toContain("Bearer ${await accessToken()}");
    expect(serverAuth).toContain("supabase.auth.getUser(bearerToken");
    expect(webview).toContain("isNativeShellOrigin");
    expect(webview).toContain("NATIVE_SHELL_ORIGINS");
  });

  it("handles App/Universal Links and offline retry in the local client", () => {
    expect(nativeApp).toContain("appUrlOpen");
    expect(nativeApp).toContain("nativeScreenFromUrl");
    expect(nativeApp).toContain("Try again");
  });
});
