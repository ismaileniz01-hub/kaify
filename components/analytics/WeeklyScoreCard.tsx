"use client";

import { Target } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import type { WeeklyFitnessScoreDTO } from "@/lib/services/analytics.service";

type Props = {
  score: WeeklyFitnessScoreDTO | null | undefined;
};

export function WeeklyScoreCard({ score }: Props) {
  const { t } = useLang();

  if (!score) return null;

  const pct = Math.min(100, Math.max(0, score.weeklyGoalPercent));

  return (
    <div className="analytics-card analytics-card--purple mt-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-purple-300/80">
            {t("analytics.weekly_score.label")}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{t("analytics.weekly_score.goal_hint")}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-purple-500/20 text-purple-200">
          <Target className="h-4 w-4" />
          <span className="text-lg font-extrabold leading-none">{pct}%</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-zinc-500">{t("analytics.weekly_score.goal_progress")}</span>
          <span className="font-semibold text-purple-200">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
