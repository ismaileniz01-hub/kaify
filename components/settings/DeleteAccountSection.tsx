"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";

export function DeleteAccountSection() {
  const { t } = useLang();
  const router = useRouter();
  const { signOut } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch {
      setError(t("settings.delete.error"));
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

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <p className="text-sm font-semibold text-red-200">{t("settings.delete.title")}</p>
      <p className="text-xs leading-relaxed text-zinc-400">{t("settings.delete.retention")}</p>
      <label className="block">
        <span className="text-[11px] text-zinc-500">{t("settings.delete.reason_label")}</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-red-500/40"
          placeholder={t("settings.delete.reason_placeholder")}
        />
      </label>
      <label className="block">
        <span className="text-[11px] text-zinc-500">{t("settings.delete.confirm_label")}</span>
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
          disabled={busy || confirm !== "DELETE"}
          onClick={() => void deleteAccount()}
          className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {t("settings.delete.submit")}
        </button>
      </div>
    </div>
  );
}
