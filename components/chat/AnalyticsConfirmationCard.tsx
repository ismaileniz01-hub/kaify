"use client";

import { useState } from "react";
import { apiPost, ApiClientError } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { notifyAnalyticsUpdated } from "@/lib/analytics-client-cache";
import {
  resolvedConfirmationStatus,
  type ChatConfirmationPayload,
} from "@/lib/analytics/confirmation-payload";

export function AnalyticsConfirmationCard({
  payload,
  onResolved,
}: {
  payload: ChatConfirmationPayload;
  onResolved?: (status: "confirmed" | "rejected") => void;
}) {
  const { t } = useLang();
  const initial = resolvedConfirmationStatus(payload);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"confirmed" | "rejected" | null>(initial);
  const [failed, setFailed] = useState(false);
  const [pendingAction, setPendingAction] = useState<"confirm" | "reject" | null>(null);

  const act = async (action: "confirm" | "reject") => {
    if (busy || done) return;
    setBusy(true);
    setFailed(false);
    setPendingAction(action);
    try {
      await apiPost("/api/analytics/confirm", {
        pendingId: payload.pendingId,
        action,
      });
      const status = action === "confirm" ? "confirmed" : "rejected";
      setDone(status);
      notifyAnalyticsUpdated();
      onResolved?.(status);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "NOT_FOUND") {
        const status = action === "confirm" ? "confirmed" : "rejected";
        setDone(status);
        notifyAnalyticsUpdated();
        onResolved?.(status);
      } else {
        setFailed(true);
      }
    } finally {
      setBusy(false);
    }
  };

  if (done === "confirmed") {
    return (
      <p className="mt-2 text-xs text-emerald-300">{t("analytics.confirm.done")}</p>
    );
  }
  if (done === "rejected") {
    return <p className="mt-2 text-xs text-zinc-500">{t("analytics.confirm.skipped")}</p>;
  }

  return (
    <div className="chat-confirm-settle mt-2 rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-xs text-zinc-300">{payload.summary}</p>
      <div className="mt-2 flex gap-2">
        {failed ? (
          <p className="w-full text-xs text-red-300" role="alert">
            {t("analytics.confirm.failed")}
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(pendingAction ?? "confirm")}
          className="flex-1 rounded-lg bg-emerald-600/80 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {failed ? t("common.retry") : t("analytics.confirm.yes")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("reject")}
          className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-medium text-zinc-300 disabled:opacity-50"
        >
          {t("analytics.confirm.no")}
        </button>
      </div>
    </div>
  );
}
