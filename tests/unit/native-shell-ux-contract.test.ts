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

describe("wave C+D native UX remaining gaps", () => {
  it("closes custom sheets on Android back", () => {
    expect(source("components/analytics/CalorieHistorySheet.tsx")).toContain(
      'data-app-overlay="open"',
    );
    expect(source("components/library/ExerciseDetailSheet.tsx")).toContain(
      'data-app-overlay="open"',
    );
    expect(source("components/market/DailyChestOpening.tsx")).toContain(
      'data-app-overlay="open"',
    );
    expect(source("hooks/useAndroidBackClose.ts")).toContain("ANDROID_BACK_EVENT");
  });

  it("scrolls focused inputs above the native keyboard", () => {
    expect(source("hooks/useScrollFocusedInputIntoView.ts")).toContain(
      "visualViewport",
    );
    expect(source("app/(app)/settings/page.tsx")).toContain(
      "useScrollFocusedInputIntoView",
    );
    expect(source("components/auth/SignupWizard.tsx")).toContain(
      "useScrollFocusedInputIntoView",
    );
    expect(source("components/auth/EmailOtpLogin.tsx")).toContain(
      "useScrollFocusedInputIntoView",
    );
    expect(source("app/(app)/settings/contact/page.tsx")).toContain(
      "useScrollFocusedInputIntoView",
    );
  });

  it("refetches list screens on offline retry", () => {
    expect(source("app/(app)/analytics/page.tsx")).toContain("useOfflineRetry");
    expect(source("app/(app)/chat/team/page.tsx")).toContain("useOfflineRetry");
    expect(source("app/(app)/messages/page.tsx")).toContain("useOfflineRetry");
    expect(source("app/(app)/trophy-road/page.tsx")).toContain("useOfflineRetry");
    expect(source("app/(app)/leaderboard/page.tsx")).toContain("useOfflineRetry");
    expect(source("components/welcome/CountryLeaderboard.tsx")).toContain(
      "useOfflineRetry",
    );
    expect(source("app/(app)/settings/contact/page.tsx")).toContain(
      "useOfflineRetry",
    );
    expect(source("components/library/WorkoutPlanCard.tsx")).toContain(
      "useOfflineRetry",
    );
  });

  it("does not hang account loading without a retry path", () => {
    expect(source("components/account/MyAccountPage.tsx")).toContain("loadStuck");
    expect(source("components/account/MyAccountPage.tsx")).toContain("offline.retry");
  });

  it("reads saved theme before first paint and keeps chat delete undo", () => {
    expect(source("lib/theme-context.tsx")).toContain('localStorage.getItem("kaify-theme")');
    expect(source("components/chat/LiveChatPanel.tsx")).toContain('t("chat.delete.undo")');
  });
});

describe("wave E UX locks", () => {
  it("asks for microphone permission only after an in-app rationale", () => {
    const composer = source("components/chat/ChatComposer.tsx");
    expect(composer).toContain("speech.permission.rationale");
    expect(composer).toContain("isNativeSpeechGranted");
    expect(source("lib/use-speech-recognition.ts")).toContain(
      "SpeechRecognition.requestPermissions",
    );
  });

  it("does not persist device-detected language to localStorage", () => {
    const ctx = source("lib/lang-context.tsx");
    expect(ctx).toContain("detectLangFromNavigator");
    expect(ctx).toMatch(/if \(isSupportedLang\(stored\)\) return stored/);
    expect(ctx.match(/localStorage\.setItem\(STORAGE_KEY/g)?.length).toBe(1);
  });

  it("maps security MFA errors to product copy, not raw SDK strings", () => {
    const security = source("app/(app)/settings/security/page.tsx");
    expect(security).not.toContain("enrollError?.message");
    expect(security).not.toContain("unenrollError.message");
    expect(security).not.toContain("signOutError.message");
    expect(security).toContain('t("mfa.error.enroll")');
  });

  it("pads notification and country sheets for the home indicator", () => {
    expect(source("components/notifications/NotificationCenter.tsx")).toContain(
      "safe-bottom",
    );
    expect(source("components/welcome/CountryLeaderboard.tsx")).toContain(
      "safe-bottom",
    );
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
