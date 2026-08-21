"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, ApiClientError } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import {
  StepUpChallenge,
  isStepUpRequiredError,
} from "@/components/auth/StepUpChallenge";

export function DeleteAccountSection() {
  const { t } = useLang();
  const router = useRouter();
  const { signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsStepUp, setNeedsStepUp] = useState(false);

  const deleteAccount = async () => {
    if (confirm !== "DELETE" || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiDelete<{ deleted: boolean }>("/api/profile", {
        confirm: "DELETE",
        reason: reason.trim(),
      });
      await signOut();
      router.replace("/login");
    } catch (err) {
      if (isStepUpRequiredError(err)) {
        setNeedsStepUp(true);
        setError(null);
      } else if (
        err instanceof ApiClientError &&
        (err.code === "SERVICE_UNAVAILABLE" || err.code === "CONFLICT")
      ) {
        setError(t("settings.delete.billing_error"));
      } else {
        setError(t("settings.delete.error"));
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-red-400 transition hover:text-red-300"
      >
        {t("settings.delete.action")}
      </button>
    );
  }

  if (needsStepUp) {
    return (
      <div className="mt-3">
        <StepUpChallenge
          onCancel={() => setNeedsStepUp(false)}
          onVerified={() => {
            setNeedsStepUp(false);
            void deleteAccount();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <p className="text-sm font-semibold text-red-200">{t("settings.delete.title")}</p>
      <p className="text-xs leading-relaxed text-zinc-400">{t("settings.delete.retention")}</p>
      <label className="block">
        <span className="type-caption type-muted">{t("settings.delete.reason_label")}</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-red-500/40"
          placeholder={t("settings.delete.reason_placeholder")}
        />
      </label>
      <label className="block">
        <span className="type-caption type-muted">{t("settings.delete.confirm_label")}</span>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white outline-none focus:border-red-500/40"
          placeholder="DELETE"
        />
      </label>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg border border-white/10 py-2 text-xs text-zinc-300"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          disabled={confirm !== "DELETE" || busy}
          onClick={() => void deleteAccount()}
          className="flex-1 rounded-lg bg-red-600/80 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {busy ? t("common.loading") : t("settings.delete.submit")}
        </button>
      </div>
    </div>
  );
}
