import { useEffect, useId, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { isCompleteOtp } from "@/lib/auth/otp";
import { maskEmail } from "@/lib/auth/mask-email";
import { NativeFitnessWallpaper } from "./NativeFitnessWallpaper";
import { NativeOtpDigitInput } from "./NativeOtpDigitInput";

export type NativeAuthMode = "login" | "signup";
export type NativeAuthStep = "email" | "code";

export type NativeLoginScreenProps = {
  mode: NativeAuthMode;
  step: NativeAuthStep;
  email: string;
  otp: string;
  busy: boolean;
  online: boolean;
  error: string;
  acceptedLegal: boolean;
  acceptedAi: boolean;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onAcceptedLegalChange: (value: boolean) => void;
  onAcceptedAiChange: (value: boolean) => void;
  onModeChange: (mode: NativeAuthMode) => void;
  onStepChange: (step: NativeAuthStep) => void;
  onSendCode: () => void | Promise<void>;
  onVerifyCode: () => void | Promise<void>;
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
  otp,
  busy,
  online,
  error,
  acceptedLegal,
  acceptedAi,
  onEmailChange,
  onOtpChange,
  onAcceptedLegalChange,
  onAcceptedAiChange,
  onModeChange,
  onStepChange,
  onSendCode,
  onVerifyCode,
  onClearError,
}: NativeLoginScreenProps) {
  const idPrefix = useId();
  const emailId = `${idPrefix}-email`;
  const errorId = `${idPrefix}-error`;
  const isSignup = mode === "signup";
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const canSend =
    email.trim().includes("@") &&
    online &&
    !busy &&
    (!isSignup || (acceptedLegal && acceptedAi));

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    await onSendCode();
    setResendIn(60);
  }

  async function handleVerify(event?: FormEvent) {
    event?.preventDefault();
    if (!isCompleteOtp(otp) || busy || !online) return;
    await onVerifyCode();
  }

  if (step === "code") {
    return (
      <div className="phone-shell login-page" data-testid="native-login">
        <NativeFitnessWallpaper />
        <main className="login-page-main">
          <div className="login-otp-panel login-otp-panel--code">
            <div className="login-otp-heading">
              <h2>Check your email</h2>
              <p>
                {isSignup
                  ? "Enter the code to finish creating your account."
                  : "Enter the 6-digit code from your email."}
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
              Change email
            </button>

            <div className="login-otp-sent-card">
              <div className="login-otp-sent-icon">
                <CheckCircle2 className="icon-md text-emerald" aria-hidden />
              </div>
              <p className="login-otp-sent-hint">
                Check your inbox for a 6-digit code (email is in English).
              </p>
              <p className="login-otp-email-chip">
                <Mail className="icon-sm text-purple" aria-hidden />
                {maskEmail(email)}
              </p>
            </div>

            <div className="login-otp-code-block">
              <p className="login-otp-code-label">6-digit code</p>
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
              {busy ? "Verifying…" : isSignup ? "Create account" : "Sign in"}
              <ArrowRight className="icon-md" aria-hidden />
            </button>

            <div className="login-otp-resend">
              <button
                type="button"
                className="link-purple"
                disabled={busy || !online || resendIn > 0}
                onClick={() => void handleSend()}
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
              <p className="login-otp-expires">
                <ShieldCheck className="icon-sm" aria-hidden />
                Code expires in a few minutes
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
              4 coaches. One team. Designed for you.
            </p>
            {isSignup ? (
              <p className="login-mode-line">
                Already have an account?{" "}
                <button
                  type="button"
                  className="link-purple"
                  onClick={() => {
                    onClearError();
                    onModeChange("login");
                  }}
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="login-mode-line login-mode-line--notice">
                New to Kaify Ai? Create your account at kaifyai.org, then return
                here to sign in.
              </p>
            )}
          </div>
        </div>

        <form
          className="login-otp-panel"
          onSubmit={(event) => void handleSend(event)}
        >
          <label htmlFor={emailId} className="sr-only">
            Your email address
          </label>
          <div className="login-field-pill">
            <Mail className="icon-sm text-purple" aria-hidden />
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="Your email address"
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
                  I accept the{" "}
                  <a
                    href="https://kaifyai.org/terms"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Terms
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://kaifyai.org/privacy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy Policy
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
                <span>
                  I explicitly consent to AI processing of fitness and health
                  data. I can withdraw this optional consent later.
                </span>
              </label>
            </div>
          ) : (
            <p className="login-terms">
              By continuing, you agree to our{" "}
              <a
                href="https://kaifyai.org/terms"
                target="_blank"
                rel="noreferrer"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://kaifyai.org/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          )}

          <button
            type="submit"
            className="btn-white"
            disabled={!canSend}
          >
            {busy
              ? "Sending…"
              : isSignup
                ? "Send verification code"
                : "Send login code"}
            <ArrowRight className="icon-md" aria-hidden />
          </button>

          {!isSignup ? (
            <button
              type="button"
              className="link-purple login-create-toggle"
              onClick={() => {
                onClearError();
                onModeChange("signup");
              }}
            >
              Create an account
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
  return (
    <div className="phone-shell login-page login-boot" data-testid="native-login-boot">
      <NativeFitnessWallpaper />
      <main className="login-page-main login-boot-main">
        <div className="login-spinner" aria-hidden />
        <p>Verifying…</p>
      </main>
    </div>
  );
}
