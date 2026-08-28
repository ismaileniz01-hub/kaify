import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("native local packaging contract", () => {
  const capacitor = source("capacitor.config.ts");
  const nativeApp = source("native-app/src/App.tsx");
  const nativeApi = source("native-app/src/api.ts");
  const nativeSession = source("native-app/src/session.ts");
  const serverAuth = source("lib/supabase/server.ts");
  const middleware = source("middleware.ts");

  it("keeps Android on https://localhost and iOS on the default capacitor scheme", () => {
    expect(capacitor).toContain('androidScheme: "https"');
    expect(capacitor).not.toContain('iosScheme: "https"');
    expect(capacitor).toContain('hostname: "localhost"');
    expect(capacitor).toContain("allowNavigation");
    expect(capacitor).toContain("kaifyai.org");
  });

  it("packages native-dist and cannot accept a production remote WebView URL", () => {
    expect(capacitor).toContain('webDir: "native-dist"');
    expect(capacitor).toContain('startsWith("http://")');
    expect(capacitor).not.toContain("https://kaifyai.org/login");
  });

  it("keeps required acquisition and coaching examples in the local UI", () => {
    for (const screen of ["login", "signup", "plan", "welcome", "chat"]) {
      expect(nativeApp).toContain(`"${screen}"`);
    }
    expect(nativeApp).toContain('from "@/lib/marketing/pricing-plans"');
    expect(nativeApp).toContain("sendNativeEmailOtp");
    expect(nativeApp).toContain("verifyNativeEmailOtp");
    expect(nativeApp).not.toContain("signInWithOtp");
    expect(nativeApp).not.toContain("shouldCreateUser");
  });

  it("routes native OTP through Kaify APIs instead of direct Supabase GoTrue", () => {
    const nativeOtp = source("native-app/src/auth-otp.ts");
    expect(nativeOtp).toContain("/api/auth/otp/send");
    expect(nativeOtp).toContain("/api/auth/otp/verify");
    expect(nativeOtp).toContain("__KAIFY_API_BASE__");
    expect(nativeOtp).toContain("setSession");
    expect(nativeOtp).not.toContain("SERVICE_ROLE");
    expect(nativeOtp).not.toContain("service_role");
    expect(nativeSession).toContain("nativeGoTrueFetch");
    expect(nativeSession).not.toContain(
      'from "@aparajita/capacitor-secure-storage"',
    );
    expect(source("native-app/src/native-gotrue-fetch.ts")).toContain(
      "/api/auth/session/refresh",
    );
    expect(source("app/api/auth/session/refresh/route.ts")).toContain(
      "refreshSession",
    );
    expect(source("app/api/auth/session/establish/route.ts")).toContain(
      "setSession",
    );
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
    expect(nativeSession).toContain("readWebStorage");
    expect(nativeApp).toContain("useState(false)");
    expect(nativeApp).toContain("SplashScreen.hide");
    expect(nativeApi).toContain('"Authorization"');
    expect(nativeApi).toContain("Bearer ${await accessToken()}");
    expect(serverAuth).toContain("supabase.auth.getUser(bearerToken");
    expect(middleware).toContain("Access-Control-Allow-Origin");
    expect(middleware).toContain("isNativeShellOrigin");
  });

  it("handles App/Universal Links and offline retry in the local client", () => {
    expect(nativeApp).toContain("appUrlOpen");
    expect(nativeApp).toContain("nativeScreenFromUrl");
    expect(nativeApp).toContain("Try again");
  });
});
