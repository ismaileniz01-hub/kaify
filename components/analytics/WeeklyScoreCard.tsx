"use client";

import { Dumbbell, UtensilsCrossed } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { WeeklyFitnessScoreDTO } from "@/lib/services/analytics.service";

type Props = {
  score: WeeklyFitnessScoreDTO | null | undefined;
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.round(value * 10));
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function WeeklyScoreCard({ score }: Props) {
  const { t } = useLang();

  if (!score) return null;

  return (
    <div className="analytics-card analytics-card--purple mt-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-purple-300/80">
            {t("analytics.weekly_score.label")}
          </p>
          <p className="mt-0.5 text-lg font-bold text-white">
            {score.combinedScore > 0 ? `${score.combinedScore}/10` : "—"}
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20 text-2xl font-extrabold text-purple-200">
          {score.combinedScore > 0 ? score.combinedScore : "?"}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/20 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-orange-300">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold">{t("analytics.weekly_score.food")}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-white">
            {score.foodScore > 0 ? `${score.foodScore}/10` : "—"}
          </p>
          <ScoreBar value={score.foodScore} color="#f97316" />
          <p className="mt-1 text-[9px] text-zinc-500">
            {t("analytics.weekly_score.food_days", { count: score.foodDaysLogged })}
          </p>
        </div>
        <div className="rounded-xl bg-black/20 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-emerald-300">
            <Dumbbell className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold">{t("analytics.weekly_score.body")}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-white">
            {score.bodyScore > 0 ? `${score.bodyScore}/10` : "—"}
          </p>
          <ScoreBar value={score.bodyScore} color="#22c55e" />
          <p className="mt-1 text-[9px] text-zinc-500">
            {t("analytics.weekly_score.body_scans", { count: score.bodyScansCount })}
          </p>
        </div>
      </div>
    </div>
  );
}
