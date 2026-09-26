import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { nativeScreenFromUrl } from "@/lib/native/deep-links";
import {
  loadProfile,
  profileHasPaidAccess,
  sendKaiMessage,
  type NativeProfile,
} from "./api";
import {
  detectLangFromNavigator,
  otpLocaleForLang,
} from "@/lib/i18n/detect-lang";
import { sendNativeEmailOtp, signInNativeWithPassword, verifyNativeEmailOtp } from "./auth-otp";
import { NATIVE_CLIENT_VERSION } from "./client-version";
import { enterRealKaify, resumeRealKaify } from "./enter-kaify";
import {
  clearNativeAuthStorage,
  clearNativeLogin,
  readNativeLoginAt,
  recordNativeLogin,
  supabase,
} from "./session";
import { isLoginWithinMaxAge } from "@/lib/auth/session-max-age";
import {
  NativeLoginBoot,
  NativeLoginScreen,
  type NativeAuthStep,
} from "./login/NativeLoginScreen";
import { NativeFitnessWallpaper } from "./login/NativeFitnessWallpaper";
import { useNativeKeyboardOffset } from "./login/useNativeKeyboardOffset";

type Screen = "login" | "verify" | "welcome" | "chat";

const MEMBERSHIP_REQUIRED =
  "This app is for members. Create your account and subscribe at kaifyai.org, then sign in here.";

function nativeOs(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
}

function postNativeEvent(
  name: string,
  installId: string,
  properties: Record<string, string>,
): void {
  void fetch(`${__KAIFY_API_BASE__}/api/v1/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      installId,
      platform: nativeOs(),
      properties,
    }),
  }).catch(() => undefined);
}

export function App() {
  useNativeKeyboardOffset();

  const [screen, setScreen] = useState<Screen>("login");
  const [authStep, setAuthStep] = useState<NativeAuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedAi, setAcceptedAi] = useState(false);
  const [profile, setProfile] = useState<NativeProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const rejectNonMember = useCallback(async (detail?: string) => {
    clearNativeLogin();
    await clearNativeAuthStorage();
    setProfile(null);
    setPassword("");
    setOtp("");
    setAuthStep("email");
    setScreen("login");
    setError(detail?.trim() || MEMBERSHIP_REQUIRED);
  }, []);

  const enterAsMember = useCallback(
    async (
      accessToken: string,
      refreshToken: string,
      handoffTicket?: string,
    ) => {
      // Pass bearer explicitly — never wait on WKWebView getSession locks.
      const nextProfile = await loadProfile(accessToken);
      if (!profileHasPaidAccess(nextProfile)) {
        await rejectNonMember();
        return { ok: false as const };
      }
      setProfile(nextProfile);
      recordNativeLogin();
      const handoff = await enterRealKaify(
        accessToken,
        refreshToken,
        handoffTicket,
      );
      if (!handoff.ok) {
        clearNativeLogin();
        setError(handoff.message);
        return { ok: false as const };
      }
      return { ok: true as const };
    },
    [rejectNonMember],
  );

  const resolveSignedInDestination = useCallback(async () => {
    const nextProfile = await loadProfile();
    setProfile(nextProfile);
    if (!profileHasPaidAccess(nextProfile)) {
      await rejectNonMember();
      return;
    }
    setScreen("welcome");
  }, [rejectNonMember]);

  useEffect(() => {
    document.documentElement.lang = detectLangFromNavigator();
  }, []);

  useEffect(() => {
    void SplashScreen.hide().catch(() => undefined);

    const onlineListener = () => setOnline(true);
    const offlineListener = () => setOnline(false);
    window.addEventListener("online", onlineListener);
    window.addEventListener("offline", offlineListener);

    void (async () => {
      try {
        const signedOut = new URLSearchParams(window.location.search).get("signed_out") === "1";
        await clearNativeAuthStorage();
        if (signedOut) {
          clearNativeLogin();
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
        // Sign-in is required once per SESSION_MAX_AGE_DAYS; kaifyai.org holds the
        // live tokens and sends us back with ?signed_out=1 if they are gone.
        if (navigator.onLine && isLoginWithinMaxAge(readNativeLoginAt())) {
          setBusy(true);
          resumeRealKaify();
          return;
        }
        clearNativeLogin();
      } catch {
        // Stay on login. Never keep a boot spinner.
      }
    })();

    const installKey = "kaify_install_id";
    let installId = localStorage.getItem(installKey);
    if (!installId) {
      installId = crypto.randomUUID();
      localStorage.setItem(installKey, installId);
    }
    const os = nativeOs();
    if (!localStorage.getItem("kaify_native_first_open")) {
      localStorage.setItem("kaify_native_first_open", "1");
      postNativeEvent("native.first_opened", installId, {
        os,
        app_version: NATIVE_CLIENT_VERSION,
      });
    }
    let removeUrlListener: (() => void) | undefined;
    let removeResumeListener: (() => void) | undefined;
    let removeBackListener: (() => void) | undefined;
    void CapacitorApp.addListener("appStateChange", (state) => {
      if (state.isActive) {
        postNativeEvent("native.app_resumed", installId, { os });
      }
    }).then((handle) => {
      removeResumeListener = () => {
        void handle.remove();
      };
    }).catch(() => undefined);
    void CapacitorApp.addListener("appUrlOpen", (event) => {
      const next = nativeScreenFromUrl(event.url);
      postNativeEvent("native.deep_link_received", installId, { route: next });
      postNativeEvent("native.deep_link_resolved", installId, {
        route: next,
        result: "ok",
      });
      const currentProfile = profileRef.current;
      if (next === "welcome" || next === "chat") {
        setScreen(profileHasPaidAccess(currentProfile) ? next : "login");
        return;
      }
      setScreen(next);
      if (next === "login") {
        setAuthStep("email");
      }
    }).then((handle) => {
      removeUrlListener = () => {
        void handle.remove();
      };
    }).catch(() => {
      // Browser/dev shells do not expose the native App plugin.
    });
    void CapacitorApp.addListener("backButton", () => {
      const current = screenRef.current;
      if (current === "chat") {
        setScreen("welcome");
        return;
      }
      void CapacitorApp.minimizeApp();
    })
      .then((handle) => {
        removeBackListener = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);
    return () => {
      window.removeEventListener("online", onlineListener);
      window.removeEventListener("offline", offlineListener);
      removeUrlListener?.();
      removeResumeListener?.();
      removeBackListener?.();
    };
  }, [resolveSignedInDestination]);

  async function sendCode() {
    setAuthBusy(true);
    setError("");
    try {
      const result = await sendNativeEmailOtp(
        email,
        otpLocaleForLang(detectLangFromNavigator()),
      );
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      setAuthStep("code");
      setScreen("verify");
      return result;
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Kod gönderilemedi. Lütfen tekrar dene.";
      setError(message);
      return { ok: false as const, message };
    } finally {
      setAuthBusy(false);
    }
  }

  async function signInWithPassword() {
    setAuthBusy(true);
    setError("");
    try {
      const result = await signInNativeWithPassword(email, password);
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      setPassword("");
      await enterAsMember(
        result.accessToken,
        result.refreshToken,
        result.handoffTicket,
      );
      return result;
    } catch (cause) {
      const raw =
        cause instanceof Error
          ? cause.message
          : "Sign-in failed. Please try again.";
      const message = /load failed|failed to fetch|networkerror/i.test(raw)
        ? "Bağlantı hatası. İnternetini kontrol edip tekrar dene."
        : raw;
      setError(message);
      return { ok: false as const, message };
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifyCode() {
    setAuthBusy(true);
    setError("");
    try {
      const result = await verifyNativeEmailOtp(email, otp);
      if (!result.ok) {
        setError(result.message);
        return result;
      }
      await enterAsMember(
        result.accessToken,
        result.refreshToken,
        result.handoffTicket,
      );
      return result;
    } catch (cause) {
      const raw =
        cause instanceof Error
          ? cause.message
          : "Doğrulama başarısız. Lütfen tekrar dene.";
      const message = /load failed|failed to fetch|networkerror/i.test(raw)
        ? "Bağlantı hatası. İnternetini kontrol edip tekrar dene."
        : raw;
      setError(message);
      return { ok: false as const, message };
    } finally {
      setAuthBusy(false);
    }
  }

  async function openChat() {
    if (!profileHasPaidAccess(profile)) {
      await rejectNonMember();
      return;
    }
    setScreen("chat");
  }

  async function submitChat(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    if (!profileHasPaidAccess(profile)) {
      await rejectNonMember();
      return;
    }
    setBusy(true);
    setError("");
    try {
      setReply(await sendKaiMessage(message.trim()));
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chat failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    clearNativeLogin();
    await supabase.auth.signOut();
    setProfile(null);
    setPassword("");
    setAuthStep("email");
    setScreen("login");
  }

  const showAuth = screen === "login" || screen === "verify";

  if (busy && showAuth) {
    return <NativeLoginBoot />;
  }

  if (showAuth) {
    return (
      <NativeLoginScreen
        mode="login"
        step={screen === "verify" || authStep === "code" ? "code" : "email"}
        email={email}
        password={password}
        otp={otp}
        busy={authBusy}
        online={online}
        error={error}
        acceptedLegal={acceptedLegal}
        acceptedAi={acceptedAi}
        loginOnly
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onOtpChange={setOtp}
        onAcceptedLegalChange={setAcceptedLegal}
        onAcceptedAiChange={setAcceptedAi}
        onModeChange={() => {
          // Native shell is sign-in only; account creation is website-only.
        }}
        onStepChange={(step) => {
          setAuthStep(step);
          if (step === "email") setScreen("login");
        }}
        onSendCode={sendCode}
        onPasswordSignIn={signInWithPassword}
        onVerifyCode={verifyCode}
        onClearError={() => setError("")}
      />
    );
  }

  return (
    <div className="phone-shell login-page">
      <NativeFitnessWallpaper />
      <main className="shell">
      {!online && (
        <div className="offline" role="status">
          You&apos;re offline. Your secure session is saved; reconnect to continue.
          <button
            className="link"
            type="button"
            onClick={() => {
              setOnline(navigator.onLine);
              if (navigator.onLine) {
                void resolveSignedInDestination().catch((cause) => {
                  setError(cause instanceof Error ? cause.message : "Reconnect failed.");
                });
              }
            }}
          >
            Try again
          </button>
        </div>
      )}
      <header>
        <div><span className="mark">K</span><strong>Kaify Ai</strong></div>
        {profile && <button className="link" onClick={() => void signOut()}>Sign out</button>}
      </header>
      {error && <div className="error" role="alert">{error}</div>}

      {screen === "welcome" && (
        <section className="card hero">
          <p className="eyebrow">LOCAL APP READY</p>
          <h1>Your coaching team is ready.</h1>
          <p>Login, welcome and chat are rendered from the installed bundle. Live data comes from the versioned Kaify API.</p>
          <button onClick={() => void openChat()}>Chat with Kai</button>
        </section>
      )}

      {screen === "chat" && (
        <section className="card chat">
          <button className="link" onClick={() => setScreen("welcome")}>← Back</button>
          <p className="eyebrow">KAI COACH</p>
          <h1>What are we working on?</h1>
          {reply && <div className="reply">{reply}</div>}
          <form onSubmit={(event) => void submitChat(event)}>
            <label>Your message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} maxLength={4000} /></label>
            <button disabled={busy || !online || !message.trim()}>{busy ? "Kai is thinking…" : "Send"}</button>
          </form>
        </section>
      )}
    </main>
    </div>
  );
}
