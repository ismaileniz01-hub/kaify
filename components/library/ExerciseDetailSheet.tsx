"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api/client";
import { notifyAnalyticsUpdated } from "@/lib/analytics-client-cache";
import { setAlexDraft } from "@/lib/chat/alex-draft";
import { useLang } from "@/lib/lang-context";
import type { ExerciseGroupId } from "@/lib/exercise-library";
import { InlineAlert } from "@/components/InlineAlert";

type Place = "gym" | "home";

type Props = {
  exerciseKey: string;
  groupId: ExerciseGroupId;
  place: Place;
  onClose: () => void;
};

export function ExerciseDetailSheet({
  exerciseKey,
  groupId,
  place,
  onClose,
}: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8");
  const [loadKg, setLoadKg] = useState("0");

  const name = t(exerciseKey as "library.ex.home.wide_grip_pushups");
  const muscle = t(`exercise.${groupId}` as "exercise.chest");
  const placeLabel = t(`library.${place}` as "library.gym");

  const handleDidThis = async () => {
    if (done || saving) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/analytics/workout-log", {
        exerciseKey,
        sets: Number(sets) || 1,
        reps: Number(reps) || 0,
        loadKg: Number(loadKg) || 0,
      });
      notifyAnalyticsUpdated();
      setDone(true);
      setConfirming(false);
    } catch {
      setError(t("library.did_this.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleAskAlex = () => {
    setAlexDraft(
      t("library.alex_draft", {
        name,
        muscle,
        place: placeLabel,
      }),
    );
    router.push("/chat/alex");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-detail-title"
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
              {placeLabel} · {muscle}
            </p>
            <h2
              id="exercise-detail-title"
              className="mt-1 text-lg font-bold text-white"
            >
              {name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-zinc-400 hover:text-white"
          >
            {t("common.cancel")}
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          {t("library.no_video")}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300">
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-zinc-500">{t("library.detail.muscle")}</dt>
            <dd className="mt-0.5 font-medium">{muscle}</dd>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <dt className="text-zinc-500">{t("library.detail.place")}</dt>
            <dd className="mt-0.5 font-medium">{placeLabel}</dd>
          </div>
        </dl>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="text-xs text-zinc-400">
            {t("workout.sets_label")}
            <input
              type="number"
              min={1}
              max={8}
              inputMode="numeric"
              value={sets}
              onChange={(event) => setSets(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg bg-white/5 px-2 text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            {t("workout.reps_label")}
            <input
              type="number"
              min={0}
              max={50}
              inputMode="numeric"
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg bg-white/5 px-2 text-white"
            />
          </label>
          <label className="text-xs text-zinc-400">
            {t("workout.load_label")}
            <input
              type="number"
              min={0}
              max={500}
              inputMode="decimal"
              value={loadKg}
              onChange={(event) => setLoadKg(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg bg-white/5 px-2 text-white"
            />
          </label>
        </div>

        {error ? (
          <InlineAlert className="mt-3" variant="error" message={error} />
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={saving || done}
            onClick={() => void handleDidThis()}
            className="min-h-11 rounded-full bg-emerald-500 px-4 text-sm font-bold text-zinc-950 disabled:opacity-50"
          >
            {done
              ? t("library.did_this.done")
              : confirming
                ? t("library.did_this.confirm")
                : t("library.did_this")}
          </button>
          <button
            type="button"
            onClick={handleAskAlex}
            className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-semibold text-white"
          >
            {t("library.ask_alex")}
          </button>
        </div>
      </div>
    </div>
  );
}
