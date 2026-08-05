"use client";

import { useMemo, useState } from "react";
import { apiPatch, ApiClientError } from "@/lib/api/client";
import { errorToMessage } from "@/lib/i18n/api-error";
import { useLang } from "@/lib/lang-context";
import { InlineAlert } from "@/components/InlineAlert";
import {
  PRIMARY_GOALS,
  type PrimaryGoal,
} from "@/lib/validations/goals.schema";

type GoalsValues = {
  primaryGoal: PrimaryGoal | null;
  calorieGoal: number;
  workoutsTarget: number;
  waterGoalLiters: number;
};

type Props = {
  initial: GoalsValues;
  onSaved: (next: GoalsValues) => void;
  onCancel?: () => void;
};

export function GoalsEditor({ initial, onSaved, onCancel }: Props) {
  const { t } = useLang();
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | "">(
    initial.primaryGoal ?? "",
  );
  const [calorieGoal, setCalorieGoal] = useState(String(initial.calorieGoal));
  const [workoutsTarget, setWorkoutsTarget] = useState(
    String(initial.workoutsTarget),
  );
  const [waterGoalLiters, setWaterGoalLiters] = useState(
    String(initial.waterGoalLiters),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calorieNum = Number.parseInt(calorieGoal, 10);
  const workoutsNum = Number.parseInt(workoutsTarget, 10);
  const waterNum = Number.parseFloat(waterGoalLiters);

  const valid = useMemo(() => {
    return (
      Number.isFinite(calorieNum) &&
      calorieNum >= 800 &&
      calorieNum <= 6000 &&
      Number.isFinite(workoutsNum) &&
      workoutsNum >= 1 &&
      workoutsNum <= 14 &&
      Number.isFinite(waterNum) &&
      waterNum >= 0.5 &&
      waterNum <= 10
    );
  }, [calorieNum, waterNum, workoutsNum]);

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(primaryGoal ? { primaryGoal } : {}),
        calorieGoal: calorieNum,
        workoutsTarget: workoutsNum,
        waterGoalLiters: waterNum,
      };
      await apiPatch("/api/analytics/goals", payload);
      onSaved({
        primaryGoal: primaryGoal || null,
        calorieGoal: calorieNum,
        workoutsTarget: workoutsNum,
        waterGoalLiters: waterNum,
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(errorToMessage(err, t));
      } else {
        setError(t("goals.save_error"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-purple-400/25 bg-zinc-950/90 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">{t("goals.title")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {t("goals.subtitle")}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-zinc-400 hover:text-white"
          >
            {t("goals.cancel")}
          </button>
        )}
      </div>

      <label className="mt-4 block text-xs font-medium text-zinc-400">
        {t("goals.primary")}
        <select
          value={primaryGoal}
          onChange={(e) => setPrimaryGoal(e.target.value as PrimaryGoal | "")}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
        >
          <option value="">{t("goals.primary.placeholder")}</option>
          {PRIMARY_GOALS.map((goal) => (
            <option key={goal} value={goal}>
              {t(`goals.primary.${goal}` as "goals.primary.lose_weight")}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-xs font-medium text-zinc-400">
          {t("goals.calories")}
          <input
            type="number"
            inputMode="numeric"
            min={800}
            max={6000}
            value={calorieGoal}
            onChange={(e) => setCalorieGoal(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-400">
          {t("goals.workouts")}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={14}
            value={workoutsTarget}
            onChange={(e) => setWorkoutsTarget(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-400">
          {t("goals.water")}
          <input
            type="number"
            inputMode="decimal"
            min={0.5}
            max={10}
            step={0.1}
            value={waterGoalLiters}
            onChange={(e) => setWaterGoalLiters(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white"
          />
        </label>
      </div>

      {error && (
        <InlineAlert variant="error" className="mt-3" message={error} />
      )}

      <button
        type="button"
        disabled={!valid || saving}
        onClick={() => void handleSave()}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-purple-500 px-5 text-sm font-bold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? t("goals.saving") : t("goals.save")}
      </button>
    </div>
  );
}
