"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useNativeApp } from "@/lib/native/platform";
import {
  connectHealthSteps,
  disconnectHealthSteps,
  getHealthStepsStatus,
  syncNativeHealthSteps,
  type HealthStepsStatus,
} from "@/lib/native/health-steps";
import { InlineAlert } from "@/components/InlineAlert";

export function HealthStepsSection() {
  const { t } = useLang();
  const native = useNativeApp();
  const [status, setStatus] = useState<HealthStepsStatus>("disconnected");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (native !== true) return;
    void getHealthStepsStatus().then(setStatus);
  }, [native]);

  if (native !== true) return null;

  const handleConnect = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await connectHealthSteps();
      setStatus(next);
      if (next === "connected") setMessage(t("health.steps.synced"));
      if (next === "denied") setMessage(t("health.steps.denied"));
      if (next === "unavailable") setMessage(t("health.steps.unavailable"));
    } catch {
      setStatus("denied");
      setMessage(t("health.steps.denied"));
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    disconnectHealthSteps();
    setStatus("disconnected");
    setMessage(null);
  };

  const handleSync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await syncNativeHealthSteps();
      setMessage(t("health.steps.synced"));
    } catch {
      setMessage(t("health.steps.denied"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {t("health.steps.title")}
      </h2>
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Activity className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{t("health.steps.title")}</p>
            <p className="text-[11px] text-zinc-500">{t("health.steps.desc")}</p>
            {message ? (
              <InlineAlert className="mt-2" message={message} />
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {status === "connected" ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSync()}
                    className="rounded-full bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {t("analytics.refresh")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleDisconnect}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-200"
                  >
                    {t("health.steps.disconnect")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleConnect()}
                  className="rounded-full bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {t("health.steps.connect")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
