"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { OtpDigitInput } from "@/components/auth/OtpDigitInput";
import { LegalConsentCheckbox } from "@/components/auth/AuthModeToggle";
import {
  sendEmailLoginCode,
  verifyEmailLoginCode,
  isCompleteOtp,
} from "@/lib/auth/email-otp";
import { maskEmail } from "@/lib/auth/mask-email";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import type { AuthMode } from "@/lib/auth/safe-redirect";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-redirect";
import { useLang } from "@/lib/lang-context";
import {
  PENDING_LEGAL_CONSENT_KEY,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { PENDING_OTP_EMAIL_KEY } from "@/lib/auth/logout";
import { useSession } from "@/lib/session-context";
import { apiPost } from "@/lib/api/client";
import { clearPendingReferral, getPendingReferral } from "@/lib/referral";
import { apiErrorMessage } from "@/lib/i18n/api-error";
import { otpSendSchema } from "@/lib/validations/auth-otp.schema";
import {
  executeInvisibleRecaptcha,
  InvisibleRecaptcha,
  useInvisibleRecaptchaRef,
} from "@/components/security/InvisibleRecaptcha";

const RESEND_COOLDOWN_SEC = 60;

function storePendingLegalConsent(): void {
  localStorage.setItem(
    PENDING_LEGAL_CONSENT_KEY,
    JSON.stringify({
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      acceptedAt: new Date().toISOString(),
    }),
  );
}

type EmailOtpLoginProps = {
  mode?: AuthMode;
  redirectTo?: string;
  /** When true, caller handles post-auth navigation (e.g. website signup profile step). */
  skipAutoRedirect?: boolean;
  onAuthSuccess?: () => void;
  onStepChange?: (step: "email" | "code") => void;
};

export function EmailOtpLogin({
  mode = "signup",
  redirectTo = "/welcome",
  skipAutoRedirect = false,
  onAuthSuccess,
  onStepChange,
}: EmailOtpLoginProps) {
  const { lang, t } = useLang();
  const router = useRouter();
  const { isAuthenticated, isLoading, profile, refreshSession } = useSession();
  const idPrefix = useId();
  const emailId = `${idPrefix}-email`;
  const errorId = `${idPrefix}-error`;

  const safeRedirect = sanitizeAuthRedirect(redirectTo);
  const isSignup = mode === "signup";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const captchaRef = useInvisibleRecaptchaRef();

  const goToStep = useCallback(
    (next: "email" | "code") => {
      setStep(next);
      onStepChange?.(next);
    },
    [onStepChange],
  );

  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_OTP_EMAIL_KEY);
    if (pending?.includes("@")) {
      setEmail(pending);
      goToStep("code");
    }
  }, [goToStep]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      sessionStorage.removeItem(PENDING_OTP_EMAIL_KEY);
      if (skipAutoRedirect) {
        onAuthSuccess?.();
        return;
      }
      router.replace(resolvePostAuthRedirect(profile, safeRedirect));
    }
  }, [
    isAuthenticated,
    isLoading,
    onAuthSuccess,
    profile,
    router,
    safeRedirect,
    skipAutoRedirect,
  ]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const canSendCode =
    otpSendSchema.safeParse({ email: email.trim() }).success &&
    (!isSignup || legalAccepted);

  const sendCode = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (isSignup && !legalAccepted) {
      setError(t("login.error.legal_required"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      storePendingLegalConsent();
      const recaptchaToken = await executeInvisibleRecaptcha(captchaRef);
      const result = await sendEmailLoginCode(
        trimmed,
        recaptchaToken,
        lang === "tr" ? "tr" : "en",
      );
      if (!result.ok) {
        setError(apiErrorMessage(result.code, t));
        return;
      }
      setEmail(trimmed);
      setCode("");
      sessionStorage.setItem(PENDING_OTP_EMAIL_KEY, trimmed);
      goToStep("code");
      setResendIn(RESEND_COOLDOWN_SEC);
    } catch {
      setError(t("login.error.failed"));
    } finally {
      setLoading(false);
    }
  }, [captchaRef, email, goToStep, isSignup, lang, legalAccepted, t]);

  const applyPendingReferral = useCallback(async () => {
    const code = getPendingReferral();
    if (!code) return;
    try {
      await apiPost("/api/referral", { code });
      clearPendingReferral();
    } catch {
      // ReferralApplySync retries on next navigation
    }
  }, []);

  const verifyCode = useCallback(
    async (token = code) => {
      if (!isCompleteOtp(token)) return;

      setLoading(true);
      setError(null);
      try {
        const result = await verifyEmailLoginCode(email, token);
        if (!result.ok) {
          setError(t("login.error.otp_invalid"));
          return;
        }
        await refreshSession();
        await applyPendingReferral();
        sessionStorage.removeItem(PENDING_OTP_EMAIL_KEY);
        if (skipAutoRedirect) {
          onAuthSuccess?.();
          return;
        }
        router.replace(safeRedirect);
      } catch {
        setError(t("login.error.otp_invalid"));
      } finally {
        setLoading(false);
      }
    },
    [applyPendingReferral, code, email, onAuthSuccess, refreshSession, router, safeRedirect, skipAutoRedirect, t],
  );

  if (isLoading) {
    return (
      <div className="login-otp-panel flex w-full max-w-sm flex-col items-center gap-3 py-8">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-purple-400" />
        <p className="text-xs text-zinc-500">{t("login.otp.verifying")}</p>
      </div>
    );
  }

  if (isAuthenticated && !skipAutoRedirect) {
    return (
      <div className="login-otp-panel flex w-full max-w-sm flex-col items-center gap-3 py-8">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-purple-400" />
        <p className="text-xs text-zinc-500">{t("login.otp.verifying")}</p>
      </div>
    );
  }

  if (isAuthenticated && skipAutoRedirect) {
    return null;
  }

  if (step === "code") {
    return (
      <div className="login-otp-panel login-otp-panel--code flex w-full flex-col gap-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-wide text-white">
            {t("login.otp.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-purple-100/80">
            {isSignup ? t("login.signup.otp_subtitle") : t("login.otp.subtitle")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(PENDING_OTP_EMAIL_KEY);
            goToStep("email");
            setCode("");
            setError(null);
          }}
          className="login-otp-back flex w-fit items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("login.otp.change_email")}
        </button>

        <div className="login-otp-sent-card relative overflow-hidden rounded-3xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-white/[0.03] px-5 py-4 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            {t("login.otp.sent_hint")}
          </p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-purple-100">
            <Mail className="h-3.5 w-3.5 text-purple-300" />
            {maskEmail(email)}
          </p>
        </div>

        <div className="login-otp-code-block flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
          <p
            id={`${idPrefix}-code-label`}
            className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            {t("login.otp.code_label")}
          </p>
          <OtpDigitInput
            value={code}
            onChange={setCode}
            onComplete={(value) => void verifyCode(value)}
            disabled={loading}
            autoFocus
          />
        </div>

        <button
          type="button"
          onClick={() => void verifyCode()}
          disabled={loading || !isCompleteOtp(code)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-4 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(124,58,237,0.45)] transition hover:from-purple-400 hover:to-violet-500 disabled:opacity-45"
        >
          {loading
            ? t("login.otp.verifying")
            : isSignup
              ? t("login.signup.verify")
              : t("login.otp.verify")}
          <ArrowRight className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-2 text-center">
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={loading || resendIn > 0}
            className="text-xs font-medium text-purple-200/90 transition hover:text-white disabled:opacity-45"
          >
            {resendIn > 0
              ? t("login.otp.resend_wait", { seconds: String(resendIn) })
              : t("login.otp.resend")}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("login.otp.expires_hint")}
          </p>
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200"
          >
            {error}
          </p>
        )}
        <InvisibleRecaptcha captchaRef={captchaRef} />
      </div>
    );
  }

  return (
    <div className="login-otp-panel flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="sr-only">
          {t("login.email_placeholder")}
        </label>
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-3.5 shadow-inner shadow-black/20 backdrop-blur-sm">
          <Mail className="h-4 w-4 shrink-0 text-purple-300/80" aria-hidden />
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSendCode) void sendCode();
            }}
            placeholder={t("login.email_placeholder")}
            autoComplete="email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {isSignup && (
        <LegalConsentCheckbox checked={legalAccepted} onChange={setLegalAccepted} />
      )}

      {!isSignup && (
        <p className="text-center text-[11px] leading-relaxed text-zinc-500">
          {t("login.terms")}{" "}
          <Link href="/terms" className="text-purple-300/90 underline-offset-2 hover:underline">
            {t("login.terms_link")}
          </Link>{" "}
          {t("login.legal_and")}{" "}
          <Link href="/privacy" className="text-purple-300/90 underline-offset-2 hover:underline">
            {t("login.privacy_link")}
          </Link>
        </p>
      )}

      <button
        type="button"
        onClick={() => void sendCode()}
        disabled={loading || !canSendCode}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-semibold text-zinc-900 shadow-xl transition hover:bg-zinc-100 disabled:opacity-50"
      >
        {loading
          ? t("login.otp.loading")
          : isSignup
            ? t("login.signup.submit")
            : t("login.otp.submit")}
        <ArrowRight className="h-5 w-5" />
      </button>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200"
        >
          {error}
        </p>
      )}
      <InvisibleRecaptcha captchaRef={captchaRef} />
    </div>
  );
}
