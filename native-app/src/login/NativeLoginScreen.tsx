import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { isCompleteOtp } from "@/lib/auth/otp";
import { maskEmail } from "@/lib/auth/mask-email";
import type {
  NativeOtpFailure,
  NativeOtpSendSuccess,
} from "../auth-otp";
import {
  clearResendAvailableAt,
  computeResendAvailableAt,
  loadResendAvailableAt,
  persistResendAvailableAt,
  remainingResendSeconds,
  resendButtonLabel,
} from "../otp-resend-timer";
import { NativeFitnessWallpaper } from "./NativeFitnessWallpaper";
import { NativeOtpDigitInput } from "./NativeOtpDigitInput";
import { nativeLoginCopy } from "./native-login-copy";
import {
  detectLangFromNavigator,
  otpLocaleForLang,
} from "@/lib/i18n/detect-lang";

export type NativeAuthMode = "login" | "signup";
export type NativeAuthStep = "email" | "code";

export type NativeLoginScreenProps = {
  mode: NativeAuthMode;
  step: NativeAuthStep;
  email: string;
  password: string;
  otp: string;
  busy: boolean;
  online: boolean;
  error: string;
  acceptedLegal: boolean;
  acceptedAi: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onAcceptedLegalChange: (value: boolean) => void;
  onAcceptedAiChange: (value: boolean) => void;
  onModeChange: (mode: NativeAuthMode) => void;
  onStepChange: (step: NativeAuthStep) => void;
  onSendCode: () => Promise<NativeOtpSendSuccess | NativeOtpFailure>;
  onPasswordSignIn: () => Promise<{ ok: true } | NativeOtpFailure>;
  onVerifyCode: () => Promise<{ ok: true } | NativeOtpFailure>;
  onClearError: () => void;
};

/**
 * Canonical Kaify login UI for Capacitor (iOS + Android).
 * Visual parity with app/(app)/login + EmailOtpLogin — local Vite shell only.
 */
export function NativeLoginScreen({
  mode,
  step,
  email,
  password,
  otp,
  busy,
  online,
  error,
  acceptedLegal,
  acceptedAi,
  onEmailChange,
  onPasswordChange,
  onOtpChange,
  onAcceptedLegalChange,
  onAcceptedAiChange,
  onModeChange,
  onStepChange,
  onSendCode,
  onPasswordSignIn,
  onVerifyCode,
  onClearError,
}: NativeLoginScreenProps) {
  const idPrefix = useId();
  const copy = nativeLoginCopy(otpLocaleForLang(detectLangFromNavigator()));
  const emailId = `${idPrefix}-email`;
  const passwordId = `${idPrefix}-password`;
  const errorId = `${idPrefix}-error`;
  const resendStatusId = `${idPrefix}-resend-status`;
  const isSignup = mode === "signup";
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    null,
  );
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [sendInFlight, setSendInFlight] = useState(false);
  const emailRef = useRef(email);
  emailRef.current = email;

  const remaining = remainingResendSeconds(resendAvailableAt, nowTick);

  const refreshNow = useCallback(() => {
    setNowTick(Date.now());
  }, []);

  useEffect(() => {
    document.documentElement.lang = detectLangFromNavigator();
  }, []);

  // Tick from absolute timestamp — survives background by recomputing on focus.
  useEffect(() => {
    if (!resendAvailableAt || remaining <= 0) return;
    const timer = window.setTimeout(refreshNow, 250);
    return () => window.clearTimeout(timer);
  }, [resendAvailableAt, remaining, refreshNow, nowTick]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshNow();
    };
    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshNow]);

  // Restore cooldown after app reopen (email-hash key in SecureStorage).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!email.trim().includes("@")) {
        setResendAvailableAt(null);
        return;
      }
      const stored = await loadResendAvailableAt(email);
      if (cancelled) return;
      if (stored && stored > Date.now()) {
        setResendAvailableAt(stored);
        refreshNow();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, refreshNow]);

  useEffect(() => {
    if (step !== "code") return;
    const onViewport = () => {
      document
        .querySelector("[data-otp-code]")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    window.visualViewport?.addEventListener("resize", onViewport);
    return () => {
      window.visualViewport?.removeEventListener("resize", onViewport);
    };
  }, [step]);

  async function applyResendCooldown(seconds: number) {
    const at = computeResendAvailableAt(seconds);
    setResendAvailableAt(at);
    refreshNow();
    await persistResendAvailableAt(emailRef.current, at);
  }

  async function clearCooldownForEmail(nextEmail: string) {
    setResendAvailableAt(null);
    await clearResendAvailableAt(nextEmail);
  }

  const canSend =
    email.trim().includes("@") &&
    online &&
    !busy &&
    !sendInFlight &&
    (!isSignup || (acceptedLegal && acceptedAi));

  const canPasswordSignIn =
    !isSignup &&
    email.trim().includes("@") &&
    password.length >= 8 &&
    online &&
    !busy &&
    !sendInFlight;

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend || sendInFlight) return;
    if (step === "code" && remaining > 0) return;
    setSendInFlight(true);
    try {
      const result = await onSendCode();
      if (!result.ok) {
        if (
          typeof result.retryAfterSeconds === "number" &&
          result.retryAfterSeconds > 0
        ) {
          await applyResendCooldown(result.retryAfterSeconds);
        }
        return;
      }
      await applyResendCooldown(result.resendAfterSeconds);
    } finally {
      setSendInFlight(false);
    }
  }

  async function handleVerify(event?: FormEvent) {
    event?.preventDefault();
    if (!isCompleteOtp(otp) || busy || !online) return;
    const result = await onVerifyCode();
    if (result.ok) {
      await clearCooldownForEmail(emailRef.current);
      setResendAvailableAt(null);
    }
  }

  async function handlePasswordSignIn() {
    if (!canPasswordSignIn) return;
    await onPasswordSignIn();
  }

  function handleEmailChange(value: string) {
    const previous = emailRef.current;
    onEmailChange(value);
    onClearError();
    if (previous.trim().toLowerCase() !== value.trim().toLowerCase()) {
      void clearCooldownForEmail(previous);
      setResendAvailableAt(null);
      onOtpChange("");
    }
  }

  if (step === "code") {
    return (
      <div className="phone-shell login-page" data-testid="native-login">
        <NativeFitnessWallpaper />
        <main className="login-page-main">
          <div className="login-otp-panel login-otp-panel--code">
            <div className="login-otp-heading">
              <h2>{copy.checkEmail}</h2>
              <p>
                {isSignup ? copy.enterCodeSignup : copy.enterCodeLogin}
              </p>
            </div>

            <button
              type="button"
              className="login-otp-back"
              onClick={() => {
                onClearError();
                onOtpChange("");
                onStepChange("email");
              }}
            >
              <ArrowLeft className="icon-sm" aria-hidden />
              {copy.changeEmail}
            </button>

            <div className="login-otp-sent-card">
              <div className="login-otp-sent-icon">
                <CheckCircle2 className="icon-md text-emerald" aria-hidden />
              </div>
              <p className="login-otp-sent-hint">
                {copy.inboxHint}
              </p>
              <p className="login-otp-email-chip">
                <Mail className="icon-sm text-purple" aria-hidden />
                {maskEmail(email)}
              </p>
            </div>

            <div className="login-otp-code-block" data-otp-code>
              <p className="login-otp-code-label">{copy.codeLabel}</p>
              <NativeOtpDigitInput
                value={otp}
                onChange={onOtpChange}
                onComplete={() => void handleVerify()}
                disabled={busy || !online}
                autoFocus
              />
            </div>

            <button
              type="button"
              className="btn-primary-gradient"
              disabled={busy || !online || !isCompleteOtp(otp)}
              onClick={() => void handleVerify()}
            >
              {busy ? copy.verifying : isSignup ? copy.createAccount : copy.signIn}
              <ArrowRight className="icon-md" aria-hidden />
            </button>

            <div className="login-otp-resend">
              <button
                type="button"
                className="link-purple"
                disabled={busy || !online || remaining > 0 || sendInFlight}
                onClick={() => void handleSend()}
                aria-describedby={resendStatusId}
                aria-label={resendButtonLabel(remaining)}
              >
                {resendButtonLabel(remaining)}
              </button>
              <span id={resendStatusId} className="sr-only" aria-live="polite">
                {remaining > 0
                  ? `Yeni kod ${remaining} saniye sonra istenebilir.`
                  : "Yeni kod istenebilir."}
              </span>
              <p className="login-otp-expires">
                <ShieldCheck className="icon-sm" aria-hidden />
                {copy.codeExpires}
              </p>
            </div>

            {error ? (
              <p id={errorId} role="alert" className="login-error">
                {error}
              </p>
            ) : null}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="phone-shell login-page" data-testid="native-login">
      <NativeFitnessWallpaper />
      <main className="login-page-main">
        <div className="login-hero">
          <div className="login-logo-wrap">
            <div className="login-logo-glow" aria-hidden />
            <img
              src="./kaify-logo.png"
              alt="Kaify Ai"
              width={220}
              height={220}
              className="login-logo"
            />
          </div>
          <div className="login-hero-copy">
            <h1>Kaify Ai</h1>
            <p className="login-subtitle">
              {copy.subtitle}
            </p>
            {isSignup ? (
              <p className="login-mode-line">
                {copy.haveAccount}{" "}
                <button
                  type="button"
                  className="link-purple"
                  onClick={() => {
                    onClearError();
                    onModeChange("login");
                  }}
                >
                  {copy.signIn}
                </button>
              </p>
            ) : (
              <p className="login-mode-line login-mode-line--notice">
                {copy.newUserHint}
              </p>
            )}
          </div>
        </div>

        <form
          className="login-otp-panel"
          onSubmit={(event) => void handleSend(event)}
        >
          <label htmlFor={emailId} className="sr-only">
            {copy.emailPlaceholder}
          </label>
          <div className="login-field-pill">
            <Mail className="icon-sm text-purple" aria-hidden />
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder={copy.emailPlaceholder}
              autoComplete="email"
              inputMode="email"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          {isSignup ? (
            <div className="login-consent">
              <label className="login-check">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => onAcceptedLegalChange(e.target.checked)}
                />
                <span>
                  {copy.acceptTermsPrefix}{" "}
                  <a
                    href="https://kaifyai.org/terms"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.terms}
                  </a>{" "}
                  {copy.and}{" "}
                  <a
                    href="https://kaifyai.org/privacy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.privacy}
                  </a>
                  .
                </span>
              </label>
              <label className="login-check">
                <input
                  type="checkbox"
                  checked={acceptedAi}
                  onChange={(e) => onAcceptedAiChange(e.target.checked)}
                />
                <span>{copy.aiConsent}</span>
              </label>
            </div>
          ) : (
            <p className="login-terms">
              {copy.byContinuing}{" "}
              <a
                href="https://kaifyai.org/terms"
                target="_blank"
                rel="noreferrer"
              >
                {copy.termsOfService}
              </a>{" "}
              {copy.and}{" "}
              <a
                href="https://kaifyai.org/privacy"
                target="_blank"
                rel="noreferrer"
              >
                {copy.privacy}
              </a>
            </p>
          )}

          <button
            type="submit"
            className="btn-white"
            disabled={!canSend}
          >
            {busy
              ? copy.sending
              : isSignup
                ? copy.sendVerify
                : copy.sendLogin}
            <ArrowRight className="icon-md" aria-hidden />
          </button>

          {!isSignup ? (
            <>
              <p className="login-password-or">{copy.or}</p>
              <label htmlFor={passwordId} className="sr-only">
                {copy.password}
              </label>
              <div className="login-field-pill">
                <Lock className="icon-sm text-purple" aria-hidden />
                <input
                  id={passwordId}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    onPasswordChange(e.target.value);
                    onClearError();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handlePasswordSignIn();
                    }
                  }}
                  placeholder={copy.password}
                  autoComplete="current-password"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>
              <button
                type="button"
                className="btn-password"
                disabled={!canPasswordSignIn}
                onClick={() => void handlePasswordSignIn()}
              >
                {busy ? copy.signingIn : copy.signInPassword}
                <ArrowRight className="icon-md" aria-hidden />
              </button>
            </>
          ) : null}

          {!isSignup ? (
            <button
              type="button"
              className="link-purple login-create-toggle"
              onClick={() => {
                onClearError();
                onModeChange("signup");
              }}
            >
              {copy.createAnAccount}
            </button>
          ) : null}

          {error ? (
            <p id={errorId} role="alert" className="login-error">
              {error}
            </p>
          ) : null}
        </form>
      </main>
    </div>
  );
}

export function NativeLoginBoot() {
  const copy = nativeLoginCopy(otpLocaleForLang(detectLangFromNavigator()));
  return (
    <div className="phone-shell login-page login-boot" data-testid="native-login-boot">
      <NativeFitnessWallpaper />
      <main className="login-page-main login-boot-main">
        <div className="login-spinner" aria-hidden />
        <p>{copy.preparing}</p>
      </main>
    </div>
  );
}
