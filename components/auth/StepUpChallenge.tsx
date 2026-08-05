"use client";

import { useState } from "react";
import { apiPost, ApiClientError } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { errorToMessage } from "@/lib/i18n/api-error";
import { InlineAlert } from "@/components/InlineAlert";

type StepUpChallengeProps = {
  onVerified: () => void;
  onCancel?: () => void;
};

/** Email OTP challenge before delete / export when MFA is not enrolled. */
export function StepUpChallenge({ onVerified, onCancel }: StepUpChallengeProps) {
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/auth/step-up/send");
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? errorToMessage(err, t)
          : t("settings.step_up.send_error"),
      );
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/auth/step-up/verify", { token: code.trim() });
      onVerified();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? errorToMessage(err, t)
          : t("settings.step_up.verify_error"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-amber-400/25 bg-amber-500/5 p-4">
      <p className="text-sm font-semibold text-amber-100">{t("settings.step_up.title")}</p>
      <p className="text-xs leading-relaxed text-zinc-400">{t("settings.step_up.body")}</p>
      {error && (
        <InlineAlert
          message={error}
          onDismiss={() => setError(null)}
          dismissLabel={t("common.dismiss")}
        />
      )}
      {!sent ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void sendCode()}
          className="touch-44 w-full rounded-xl bg-amber-500/20 px-3 py-2.5 text-sm font-semibold text-amber-100 disabled:opacity-50"
        >
          {busy ? t("common.loading") : t("settings.step_up.send")}
        </button>
      ) : (
        <div className="space-y-2">
          <label className="block">
            <span className="type-caption type-muted">{t("settings.step_up.code_label")}</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-amber-400/40"
              placeholder="123456"
            />
          </label>
          <button
            type="button"
            disabled={busy || code.trim().length < 4}
            onClick={() => void verify()}
            className="touch-44 w-full rounded-xl bg-amber-500/25 px-3 py-2.5 text-sm font-semibold text-amber-50 disabled:opacity-50"
          >
            {busy ? t("common.loading") : t("settings.step_up.verify")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendCode()}
            className="w-full text-center text-xs text-zinc-400 underline-offset-2 hover:underline"
          >
            {t("settings.step_up.resend")}
          </button>
        </div>
      )}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-xs text-zinc-500"
        >
          {t("common.cancel")}
        </button>
      )}
    </div>
  );
}

export function isStepUpRequiredError(err: unknown): boolean {
  return err instanceof ApiClientError && err.code === "STEP_UP_REQUIRED";
}
