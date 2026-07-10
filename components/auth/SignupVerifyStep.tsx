"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { OtpDigitInput } from "@/components/auth/OtpDigitInput";
import {
  sendEmailLoginCode,
  verifyEmailLoginCode,
  normalizeOtpInput,
  isCompleteOtp,
} from "@/lib/auth/email-otp";
import { OTP_LENGTH } from "@/lib/auth/otp";
import { maskEmail } from "@/lib/auth/mask-email";
import { apiErrorMessage } from "@/lib/i18n/api-error";
import { useLang } from "@/lib/lang-context";

type Props = {
  email: string;
  onVerified: () => void | Promise<void>;
  onBack?: () => void;
};

export function SignupVerifyStep({ email, onVerified, onBack }: Props) {
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const resend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendEmailLoginCode(email);
      if (!result.ok) {
        setError(apiErrorMessage(result.code, t));
        return;
      }
      setCode("");
      setResendIn(60);
    } finally {
      setLoading(false);
    }
  }, [email]);

  const verify = useCallback(
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
        await onVerified();
      } catch {
        setError(t("login.error.otp_invalid"));
      } finally {
        setLoading(false);
      }
    },
    [code, email, onVerified, t],
  );

  return (
    <div className="flex flex-col gap-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="login-otp-back flex w-fit items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("signup.verify.back")}
        </button>
      )}

      <div className="login-otp-sent-card relative overflow-hidden rounded-3xl border border-purple-500/25 bg-gradient-to-b from-purple-500/15 to-white/[0.03] px-5 py-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">{t("signup.verify.sent_hint")}</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-purple-100">
          <Mail className="h-3.5 w-3.5 text-purple-300" />
          {maskEmail(email)}
        </p>
      </div>

      <div className="login-otp-code-block flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          {t("login.otp.code_label")}
        </p>
        <OtpDigitInput
          value={code}
          onChange={setCode}
          onComplete={(value) => void verify(value)}
          disabled={loading}
          autoFocus
        />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          value={code}
          onChange={(e) => {
            const next = normalizeOtpInput(e.target.value);
            setCode(next);
            if (isCompleteOtp(next)) void verify(next);
          }}
          placeholder={t("login.otp.code_placeholder")}
          aria-label={t("login.otp.code_placeholder")}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] text-white placeholder:tracking-normal placeholder:text-zinc-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        />
      </div>

      <button
        type="button"
        onClick={() => void verify()}
        disabled={loading || !isCompleteOtp(code)}
        className="landing-btn landing-btn--primary flex w-full items-center justify-center gap-2 disabled:opacity-45"
      >
        {loading ? t("login.otp.verifying") : t("signup.verify.submit")}
        <ArrowRight className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center gap-2 text-center">
        <button
          type="button"
          onClick={() => void resend()}
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
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
