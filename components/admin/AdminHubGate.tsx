"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { InlineAlert } from "@/components/InlineAlert";

type HubStatus = { unlocked: boolean };

export function AdminHubGate({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await apiGet<HubStatus>("/api/admin/hub/status");
      setUnlocked(status.unlocked);
    } catch {
      setUnlocked(false);
      setError(t("admin.gate.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleUnlock = async () => {
    if (!password.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost<{ unlocked: boolean }>("/api/admin/hub/verify", {
        password: password.trim(),
      });
      setPassword("");
      setUnlocked(true);
    } catch {
      setError(t("admin.gate.wrong_password"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 ring-1 ring-purple-400/30">
              <Lock className="h-5 w-5 text-purple-300" />
            </span>
            <div>
              <h1 className="text-lg font-bold">{t("admin.gate.title")}</h1>
              <p className="text-xs text-zinc-500">{t("admin.gate.subtitle")}</p>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-zinc-400">{t("admin.gate.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleUnlock();
              }}
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="mt-3">
              <InlineAlert variant="error" message={error} />
            </div>
          )}

          <button
            type="button"
            disabled={busy || !password.trim()}
            onClick={() => void handleUnlock()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {t("admin.gate.unlock")}
          </button>
        </div>
      </div>
    );
  }

  return children;
}
