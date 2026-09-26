"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";
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
  const initialCalories = payload.calories;
  const initialProtein = payload.protein;
  const isWaterOnly =
    payload.calories == null &&
    payload.protein == null &&
    payload.waterLiters != null;
  const [calories, setCalories] = useState(
    initialCalories != null ? String(initialCalories) : "",
  );
  const [protein, setProtein] = useState(
    initialProtein != null ? String(initialProtein) : "",
  );

  const act = async (action: "confirm" | "reject") => {
    if (busy || done) return;
    setBusy(true);
    setFailed(false);
    setPendingAction(action);
    try {
      const cal = Number(calories);
      const pro = Number(protein);
      const userEditedMacros =
        (calories.trim() !== "" &&
          Number.isFinite(cal) &&
          cal !== (initialCalories ?? Number.NaN)) ||
        (protein.trim() !== "" &&
          Number.isFinite(pro) &&
          pro !== (initialProtein ?? Number.NaN));
      const shouldCorrect =
        action === "confirm" && Number.isFinite(cal) && cal > 0 && userEditedMacros;
      await apiPost("/api/analytics/confirm", {
        pendingId: payload.pendingId,
        action: shouldCorrect ? "correct" : action,
        calories: shouldCorrect ? cal : undefined,
        protein: shouldCorrect && Number.isFinite(pro) ? pro : undefined,
        carbs: payload.carbs,
        fat: payload.fat,
      });
      const status = action === "confirm" ? "confirmed" : "rejected";
      setDone(status);
      notifyAnalyticsUpdated();
      onResolved?.(status);
    } catch {
      setFailed(true);
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
      {typeof payload.confidence === "number" && payload.confidence < 0.7 ? (
        <p className="mt-1 text-[11px] text-amber-300">{t("analytics.confirm.low_confidence")}</p>
      ) : null}
      {isWaterOnly ? null : (
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-[11px] text-zinc-500">
          {t("analytics.confirm.calories")}
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="mt-1 w-full rounded-md bg-black/40 px-2 py-1 text-xs text-white"
          />
        </label>
        <label className="text-[11px] text-zinc-500">
          {t("analytics.confirm.protein")}
          <input
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className="mt-1 w-full rounded-md bg-black/40 px-2 py-1 text-xs text-white"
          />
        </label>
      </div>
      )}
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
