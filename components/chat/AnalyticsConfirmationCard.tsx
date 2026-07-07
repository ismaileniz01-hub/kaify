"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";

type ConfirmationPayload = {
  pendingId: string;
  summary: string;
};

export function AnalyticsConfirmationCard({
  payload,
  onResolved,
}: {
  payload: ConfirmationPayload;
  onResolved?: () => void;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"confirmed" | "rejected" | null>(null);

  const act = async (action: "confirm" | "reject") => {
    if (busy || done) return;
    setBusy(true);
    try {
      await apiPost("/api/analytics/confirm", {
        pendingId: payload.pendingId,
        action,
      });
      setDone(action === "confirm" ? "confirmed" : "rejected");
      onResolved?.();
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
    <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-xs text-zinc-300">{payload.summary}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("confirm")}
          className="flex-1 rounded-lg bg-emerald-600/80 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {t("analytics.confirm.yes")}
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
