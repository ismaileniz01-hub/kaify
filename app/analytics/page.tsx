"use client";

import Link from "next/link";
import { Activity, ArrowLeft, Droplets, Dumbbell, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { MacroRing } from "@/components/analytics/MacroRing";
import { StatCard } from "@/components/analytics/StatCard";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import { WeeklyScoreCard } from "@/components/analytics/WeeklyScoreCard";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { apiGet } from "@/lib/api/client";
import type { AnalyticsBundleDTO } from "@/lib/services/analytics.service";

export default function AnalyticsPage() {
  const { t, unit } = useLang();
  const { isAuthenticated } = useSession();
  const [data, setData] = useState<AnalyticsBundleDTO | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiGet<AnalyticsBundleDTO>("/api/analytics")
      .then(setData)
      .catch(() => setData(null));
  }, [isAuthenticated]);

  const today = data?.today;
  const weightVal =
    today?.weightKg != null
      ? unit === "metric"
        ? `${today.weightKg} kg`
        : `${(today.weightKg * 2.205).toFixed(1)} lb`
      : unit === "metric"
        ? t("analytics.weight_value_metric")
        : t("analytics.weight_value_imperial");

  const weightTrend =
    data?.weightTrendKg != null
      ? `${data.weightTrendKg > 0 ? "▲" : "▼"} ${Math.abs(data.weightTrendKg).toFixed(1)} kg`
      : unit === "metric"
        ? t("analytics.weight_trend_metric")
        : t("analytics.weight_trend_imperial");

  const calPct = today
    ? Math.min(100, Math.round((today.caloriesConsumed / today.calorieGoal) * 100))
    : 85;
  const workoutPct = today
    ? Math.min(100, Math.round((today.workoutsCompleted / today.workoutsTarget) * 100))
    : 80;
  const waterPct = today
    ? Math.min(100, Math.round((today.waterLiters / today.waterGoalLiters) * 100))
    : 82;

  return (
    <div className="phone-shell analytics-gradient relative flex flex-col">
      <header className="animate-in animate-in--1 flex items-center justify-between px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-medium text-white">
          {t("analytics.page_title")}
        </h1>
        <div className="h-9 w-9" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Activity}
            label={t("analytics.weight")}
            value={weightVal}
            trend={weightTrend}
            barColor="#3b82f6"
            barPercent={today?.weightKg ? 62 : 62}
            gradient="blue"
          />
          <StatCard
            icon={Flame}
            label={t("analytics.calories")}
            value={t("analytics.calories_value")}
            numericValue={today ? Math.round(today.caloriesConsumed) : undefined}
            unitSuffix="kcal"
            trend={
              today
                ? `▲ ${calPct}% ${t("home.completed")}`
                : t("analytics.calories_trend")
            }
            barColor="#f97316"
            barPercent={calPct}
            gradient="orange"
          />
          <StatCard
            icon={Dumbbell}
            label={t("analytics.workouts")}
            value={
              today
                ? `${today.workoutsCompleted} / ${today.workoutsTarget}`
                : t("analytics.workouts_value")
            }
            trend={today ? t("analytics.workouts_trend") : t("analytics.workouts_trend")}
            barColor="#22c55e"
            barPercent={workoutPct}
            gradient="green"
          />
          <StatCard
            icon={Droplets}
            label={t("analytics.hydration")}
            value={today ? `${today.waterLiters} L` : t("analytics.hydration_value")}
            trend={today ? `▲ ${waterPct}% of goal` : t("analytics.hydration_trend")}
            barColor="#06b6d4"
            barPercent={waterPct}
            gradient="water"
          />
        </div>

        <div className="mt-3">
          <WeeklyChart stepsData={data?.weeklySteps} />
        </div>

        <WeeklyScoreCard score={data?.weeklyScore} />

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <MacroRing
            label={t("analytics.protein")}
            value={today ? `${today.proteinG}g` : "142g"}
            percent={
              today
                ? Math.min(100, Math.round((today.proteinG / today.proteinGoalG) * 100))
                : 72
            }
            color="#3b82f6"
            gradient="blue"
          />
          <MacroRing
            label={t("analytics.carbs")}
            value={today ? `${today.carbsG}g` : "210g"}
            percent={
              today
                ? Math.min(100, Math.round((today.carbsG / today.carbsGoalG) * 100))
                : 55
            }
            color="#22c55e"
            gradient="green"
          />
          <MacroRing
            label={t("analytics.fat")}
            value={today ? `${today.fatG}g` : "58g"}
            percent={
              today ? Math.min(100, Math.round((today.fatG / today.fatGoalG) * 100)) : 80
            }
            color="#f97316"
            gradient="orange"
          />
        </div>
      </main>
    </div>
  );
}
