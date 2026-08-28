import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("native login UI contract (canonical web parity)", () => {
  const login = source("native-app/src/login/NativeLoginScreen.tsx");
  const wallpaper = source("native-app/src/login/NativeFitnessWallpaper.tsx");
  const otp = source("native-app/src/login/NativeOtpDigitInput.tsx");
  const css = source("native-app/src/styles.css");
  const app = source("native-app/src/App.tsx");
  const keyboard = source("native-app/src/login/useNativeKeyboardOffset.ts");

  it("uses a shared NativeLoginScreen for iOS and Android shells", () => {
    expect(app).toContain("NativeLoginScreen");
    expect(app).toContain("useNativeKeyboardOffset");
    expect(login).toContain('data-testid="native-login"');
  });

  it("matches canonical web login copy and CTA", () => {
    expect(login).toContain("Kaify Ai");
    expect(login).toContain("4 coaches. One team. Designed for you.");
    expect(login).toContain("Send login code");
    expect(login).toContain("Check your email");
    expect(login).toContain("Your email address");
    expect(login).not.toContain("Sign in locally");
  });

  it("includes OTP step, loading boot, and error surface", () => {
    expect(login).toContain("NativeOtpDigitInput");
    expect(login).toContain("NativeLoginBoot");
    expect(login).toContain('role="alert"');
    expect(login).toContain("login-error");
    expect(otp).toContain("otp-digit-row");
  });

  it("ports fitness wallpaper + purple login tokens", () => {
    expect(wallpaper).toContain("fitness-wallpaper__gradient");
    expect(css).toContain("linear-gradient(165deg, #2d0a5c");
    expect(css).toContain(".phone-shell.login-page");
    expect(css).toContain(".login-logo");
    expect(css).toContain(".btn-white");
    expect(css).toContain(".btn-primary-gradient");
    expect(css).toContain("--safe-top");
    expect(css).toContain("--keyboard-offset");
  });

  it("applies safe-area and Capacitor keyboard offset handling", () => {
    expect(keyboard).toContain("keyboardWillShow");
    expect(keyboard).toContain("keyboardWillHide");
    expect(keyboard).toContain("visualViewport");
    expect(css).toContain("calc(100dvh - var(--keyboard-offset");
    expect(css).toContain("env(safe-area-inset-top");
    expect(css).toContain("env(safe-area-inset-bottom");
  });

  it("ships the logo asset for the native shell", () => {
    expect(existsSync(join(process.cwd(), "native-app/public/kaify-logo.png"))).toBe(
      true,
    );
  });

  it("does not reintroduce remote WebView login", () => {
    expect(app).not.toContain("CAPACITOR_SERVER_URL");
    expect(app).not.toContain("server.url");
    expect(login).not.toContain("kaifyai.org/login");
  });
});
