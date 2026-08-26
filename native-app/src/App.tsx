import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { PRICING_PLANS } from "@/lib/marketing/pricing-plans";
import { nativeScreenFromUrl } from "@/lib/native/deep-links";
import {
  loadProfile,
  nativeApi,
  profileHasPaidAccess,
  recordNativeSignupConsents,
  sendKaiMessage,
  type NativeProfile,
} from "./api";
import { sendNativeEmailOtp, verifyNativeEmailOtp, NATIVE_CLIENT_VERSION } from "./auth-otp";
import { supabase } from "./session";

type Screen = "login" | "signup" | "verify" | "plan" | "welcome" | "chat";

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
      platform: "android",
      properties,
    }),
  }).catch(() => undefined);
}

export function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedAi, setAcceptedAi] = useState(false);
  const [profile, setProfile] = useState<NativeProfile | null>(null);
  const [busy, setBusy] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const resolveSignedInDestination = useCallback(async () => {
    const nextProfile = await loadProfile();
    setProfile(nextProfile);
    setScreen(profileHasPaidAccess(nextProfile) ? "welcome" : "plan");
  }, []);

  useEffect(() => {
    const onlineListener = () => setOnline(true);
    const offlineListener = () => setOnline(false);
    window.addEventListener("online", onlineListener);
    window.addEventListener("offline", offlineListener);
    void supabase.auth.getSession().then(async ({ data }) => {
      try {
        if (data.session) await resolveSignedInDestination();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Account check failed.");
      } finally {
        setBusy(false);
      }
    });
    const installKey = "kaify_install_id";
    let installId = localStorage.getItem(installKey);
    if (!installId) {
      installId = crypto.randomUUID();
      localStorage.setItem(installKey, installId);
    }
    if (!localStorage.getItem("kaify_native_first_open")) {
      localStorage.setItem("kaify_native_first_open", "1");
      postNativeEvent("native.first_opened", installId, {
        os: "android",
        app_version: NATIVE_CLIENT_VERSION,
      });
    }
    let removeUrlListener: (() => void) | undefined;
    let removeResumeListener: (() => void) | undefined;
    void CapacitorApp.addListener("appStateChange", (state) => {
      if (state.isActive) {
        postNativeEvent("native.app_resumed", installId, { os: "android" });
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
        setScreen(profileHasPaidAccess(currentProfile) ? next : currentProfile ? "plan" : "login");
        return;
      }
      setScreen(next);
    }).then((handle) => {
      removeUrlListener = () => {
        void handle.remove();
      };
    }).catch(() => {
      // Browser/dev shells do not expose the native App plugin.
    });
    return () => {
      window.removeEventListener("online", onlineListener);
      window.removeEventListener("offline", offlineListener);
      removeUrlListener?.();
      removeResumeListener?.();
    };
  }, [resolveSignedInDestination]);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await sendNativeEmailOtp(email);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setScreen("verify");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await verifyNativeEmailOtp(email, otp);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (acceptedLegal && acceptedAi) {
        await recordNativeSignupConsents();
      }
      await resolveSignedInDestination();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Account check failed.");
    } finally {
      setBusy(false);
    }
  }

  async function openCheckout(planId: string) {
    setBusy(true);
    setError("");
    try {
      const response = await nativeApi("/api/v1/billing/native-checkout", {
        method: "POST",
        body: JSON.stringify({ planId, interval: "monthly" }),
      });
      if (!response.ok) {
        throw new Error("Secure checkout is unavailable. Please try again.");
      }
      const body = (await response.json()) as {
        data?: { checkoutUrl?: string };
      };
      if (!body.data?.checkoutUrl) {
        throw new Error("Secure checkout link was not returned.");
      }
      await Browser.open({
        url: body.data.checkoutUrl,
        presentationStyle: "popover",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  async function openChat() {
    if (!profileHasPaidAccess(profile)) {
      setScreen("plan");
      setError("Complete payment before coaching is unlocked.");
      return;
    }
    setScreen("chat");
  }

  async function submitChat(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    if (!profileHasPaidAccess(profile)) {
      setScreen("plan");
      setError("An active subscription is required before coaching.");
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
    await supabase.auth.signOut();
    setProfile(null);
    setScreen("login");
  }

  if (busy && screen === "login") {
    return <main className="center"><div className="spinner" /><p>Opening Kaify Ai…</p></main>;
  }

  return (
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

      {(screen === "login" || screen === "signup") && (
        <section className="card auth-card">
          <p className="eyebrow">{screen === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}</p>
          <h1>{screen === "login" ? "Sign in locally" : "Start your Kaify journey"}</h1>
          <p>The interface stays on your device. Account verification uses Kaify&apos;s secure remote API.</p>
          <form onSubmit={(event) => void sendCode(event)}>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
            {screen === "signup" && (
              <>
                <label className="check"><input type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)} />I accept the Terms and Privacy Policy.</label>
                <label className="check"><input type="checkbox" checked={acceptedAi} onChange={(event) => setAcceptedAi(event.target.checked)} />I explicitly consent to AI processing of fitness and health data. I can withdraw this optional consent later.</label>
              </>
            )}
            <button disabled={busy || !online || (screen === "signup" && (!acceptedLegal || !acceptedAi))}>{busy ? "Sending…" : "Send secure code"}</button>
          </form>
          <button className="link" onClick={() => { setError(""); setScreen(screen === "login" ? "signup" : "login"); }}>
            {screen === "login" ? "Create an account" : "Already have an account?"}
          </button>
        </section>
      )}

      {screen === "verify" && (
        <section className="card auth-card">
          <p className="eyebrow">VERIFY EMAIL</p>
          <h1>Enter your code</h1>
          <p>We sent a one-time code to {email}.</p>
          <form onSubmit={(event) => void verifyCode(event)}>
            <label>6-digit code<input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required /></label>
            <button disabled={busy || otp.length !== 6 || !online}>{busy ? "Verifying…" : "Verify"}</button>
          </form>
        </section>
      )}

      {screen === "plan" && (
        <section>
          <p className="eyebrow">CHOOSE YOUR PLAN</p>
          <h1>Coaching unlocks after payment</h1>
          <p>Compare plans here. Only secure Paddle checkout opens outside the app.</p>
          <div className="plans">
            {PRICING_PLANS.map((plan) => (
              <article className={`card plan ${plan.popular ? "popular" : ""}`} key={plan.id}>
                <h2>{plan.name}</h2><p>{plan.tagline}</p>
                <div className="price">${plan.priceMonthly}<small>/month</small></div>
                <ul>{plan.perks.slice(0, 4).map((perk) => <li key={perk}>{perk}</li>)}</ul>
                <button disabled={!online} onClick={() => void openCheckout(plan.id)}>Continue to Paddle checkout</button>
              </article>
            ))}
          </div>
          <button className="secondary" disabled={!online || busy} onClick={() => void resolveSignedInDestination()}>
            I completed payment — refresh access
          </button>
        </section>
      )}

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
  );
}
