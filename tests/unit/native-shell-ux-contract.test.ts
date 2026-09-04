import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("native shell UX contracts", () => {
  it("does not request microphone permission at Capacitor boot", () => {
    const shell = source("components/CapacitorShell.tsx");
    const speech = source("lib/native/speech-platform.ts");
    expect(shell).not.toContain("warmUpNativeSpeechPermissions");
    expect(shell).not.toContain("SpeechRecognition");
    expect(speech).not.toContain("warmUpNativeSpeechPermissions");
    expect(speech).toContain("isNativeSpeechGranted");
    expect(source("components/chat/ChatComposer.tsx")).toContain(
      "isNativeSpeechGranted",
    );
  });

  it("uses the in-app back stack on Android", () => {
    const shell = source("components/CapacitorShell.tsx");
    expect(shell).toContain("consumeAppBack");
    expect(shell).toContain("minimizeApp");
    expect(shell).toContain('setOverlaysWebView({ overlay: true })');
  });

  it("keeps Android keyboard from resizing the WebView", () => {
    expect(source("android/app/src/main/AndroidManifest.xml")).toContain(
      'android:windowSoftInputMode="adjustNothing"',
    );
    expect(source("components/CapacitorShell.tsx")).toContain("KeyboardResize.None");
  });

  it("sends native OTP with the detected locale", () => {
    const app = source("native-app/src/App.tsx");
    expect(app).toContain("otpLocaleForLang");
    expect(app).toContain("detectLangFromNavigator");
    expect(app).toContain("sendNativeEmailOtp(");
    expect(app).toContain("backButton");
    expect(app).toContain("minimizeApp");
  });
});

describe("chrome haptics and 44px targets (wave B)", () => {
  it("fires selection haptics on primary chrome taps", () => {
    const files = [
      "components/navigation/BottomNav.tsx",
      "components/navigation/AppHeader.tsx",
      "app/(app)/welcome/page.tsx",
      "components/notifications/NotificationCenter.tsx",
      "components/auth/EmailOtpLogin.tsx",
      "components/auth/SignupWizard.tsx",
      "native-app/src/login/NativeLoginScreen.tsx",
      "app/(app)/settings/page.tsx",
      "app/(app)/streak/page.tsx",
      "components/StreakRoad.tsx",
      "components/welcome/WelcomeCard.tsx",
      "components/welcome/WelcomeExtras.tsx",
      "components/welcome/FirstTaskChecklist.tsx",
      "components/chat/CoachStarterChips.tsx",
    ];
    for (const file of files) {
      expect(source(file), file).toContain("hapticSelection");
    }
  });

  it("keeps native login back control at 44px", () => {
    expect(source("native-app/src/styles.css")).toContain("min-height: 44px");
    expect(source("app/globals.css")).toContain(".touch-44");
  });
});

describe("signup legal gate (source contract)", () => {
  it("blocks web OTP signup until terms are accepted", () => {
    const login = source("components/auth/EmailOtpLogin.tsx");
    expect(login).toContain("legalAccepted");
    expect(login).toContain('t("login.error.legal_required")');
    expect(login).toMatch(/isSignup && !legalAccepted/);
    expect(login).toContain("LegalConsentCheckbox");
  });

  it("blocks the signup wizard until terms are accepted", () => {
    const wizard = source("components/auth/SignupWizard.tsx");
    expect(wizard).toContain("legalAccepted");
    expect(wizard).toContain("LegalConsentCheckbox");
    expect(wizard).toMatch(/legalAccepted/);
  });

  it("blocks native signup until legal and AI consents are checked", () => {
    const native = source("native-app/src/login/NativeLoginScreen.tsx");
    expect(native).toContain("acceptedLegal");
    expect(native).toContain("acceptedAi");
    expect(native).toContain("(!isSignup || (acceptedLegal && acceptedAi))");
  });
});
