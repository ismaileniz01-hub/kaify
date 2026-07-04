"use client";

import Link from "next/link";
import { Activity, ArrowLeft, Droplets, Dumbbell, Flame } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MacroRing } from "@/components/analytics/MacroRing";
import { StatCard } from "@/components/analytics/StatCard";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import { WeeklyScoreCard } from "@/components/analytics/WeeklyScoreCard";
import { readAnalyticsCache, writeAnalyticsCache } from "@/lib/analytics-client-cache";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { InlineAlert } from "@/components/InlineAlert";
import { errorToMessage } from "@/lib/i18n/api-error";
import { apiGet } from "@/lib/api/client";
import type { AnalyticsBundleDTO } from "@/lib/services/analytics.service";

export default function AnalyticsPage() {
  const { t, unit } = useLang();
  const { isAuthenticated } = useSession();
  const [data, setData] = useState<AnalyticsBundleDTO | null>(() => readAnalyticsCache());
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAnalytics = useCallback(() => {
    if (!isAuthenticated) return;
    setLoadError(null);
    void apiGet<AnalyticsBundleDTO>("/api/analytics")
      .then((bundle) => {
        setData(bundle);
        writeAnalyticsCache(bundle);
      })
      .catch((err) => {
        setData(null);
        setLoadError(errorToMessage(err, t) || t("analytics.error.load"));
      });
  }, [isAuthenticated, t]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadAnalytics();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadAnalytics]);

  const today = data?.today;
  const weightVal =
    today?.weightKg != null
      ? unit === "metric"
        ? `${today.weightKg} kg`
        : `${(today.weightKg * 2.205).toFixed(1)} lb`
      : "—";

  const weightTrend =
    data?.weightTrendKg != null
      ? data.weightTrendKg === 0
        ? t("analytics.weight_stable")
        : `${data.weightTrendKg > 0 ? "▲" : "▼"} ${Math.abs(data.weightTrendKg).toFixed(1)} kg`
      : t("analytics.no_trend");

  const calPct = today
    ? Math.min(100, Math.round((today.caloriesConsumed / today.calorieGoal) * 100))
    : 0;
  const workoutPct = today
    ? Math.min(100, Math.round((today.workoutsCompleted / today.workoutsTarget) * 100))
    : 0;
  const waterPct = today
    ? Math.min(100, Math.round((today.waterLiters / today.waterGoalLiters) * 100))
    : 0;

  return (
    <div className="phone-shell analytics-gradient relative flex flex-col">
      <header className="animate-in animate-in--1 flex items-center justify-between px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          prefetch
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
        {loadError && (
          <InlineAlert
            className="mb-4"
            message={loadError}
            onRetry={loadAnalytics}
            retryLabel={t("common.retry")}
            onDismiss={() => setLoadError(null)}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Activity}
            label={t("analytics.weight")}
            value={weightVal}
            trend={weightTrend}
            barColor="#3b82f6"
            barPercent={today?.weightKg ? 62 : 0}
            gradient="blue"
          />
          <StatCard
            icon={Flame}
            label={t("analytics.calories")}
            value={today ? "" : "—"}
            numericValue={today ? Math.round(today.caloriesConsumed) : undefined}
            unitSuffix="kcal"
            trend={
              today
                ? `▲ ${calPct}% ${t("home.completed")}`
                : t("analytics.no_trend")
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
                : "—"
            }
            trend={today ? t("analytics.workouts_trend") : t("analytics.no_trend")}
            barColor="#22c55e"
            barPercent={workoutPct}
            gradient="green"
          />
          <StatCard
            icon={Droplets}
            label={t("analytics.hydration")}
            value={today ? `${today.waterLiters} L` : "—"}
            trend={today ? `▲ ${waterPct}% of goal` : t("analytics.no_trend")}
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
            value={today ? `${today.proteinG}g` : "—"}
            percent={
              today
                ? Math.min(100, Math.round((today.proteinG / today.proteinGoalG) * 100))
                : 0
            }
            color="#3b82f6"
            gradient="blue"
          />
          <MacroRing
            label={t("analytics.carbs")}
            value={today ? `${today.carbsG}g` : "—"}
            percent={
              today
                ? Math.min(100, Math.round((today.carbsG / today.carbsGoalG) * 100))
                : 0
            }
            color="#22c55e"
            gradient="green"
          />
          <MacroRing
            label={t("analytics.fat")}
            value={today ? `${today.fatG}g` : "—"}
            percent={
              today ? Math.min(100, Math.round((today.fatG / today.fatGoalG) * 100)) : 0
            }
            color="#f97316"
            gradient="orange"
          />
        </div>
      </main>
    </div>
  );
}
