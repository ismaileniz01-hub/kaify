"use client";

import { Activity, Droplets, Dumbbell, Flame, RefreshCw, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MacroRing } from "@/components/analytics/MacroRing";
import { StatCard } from "@/components/analytics/StatCard";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import { WeeklyScoreCard } from "@/components/analytics/WeeklyScoreCard";
import { GoalsEditor } from "@/components/goals/GoalsEditor";
import { readAnalyticsCache, writeAnalyticsCache } from "@/lib/analytics-client-cache";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { InlineAlert } from "@/components/InlineAlert";
import { errorToMessage } from "@/lib/i18n/api-error";
import { apiGet } from "@/lib/api/client";
import type { AnalyticsBundleDTO } from "@/lib/services/analytics.service";
import { AppHeader } from "@/components/navigation/AppHeader";

export default function AnalyticsPage() {
  const { t, unit } = useLang();
  const { isAuthenticated, home, refreshHome } = useSession();
  const [data, setData] = useState<AnalyticsBundleDTO | null>(() => readAnalyticsCache());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const loadAnalytics = useCallback(() => {
    if (!isAuthenticated) return;
    setLoadError(null);
    setRefreshing(true);
    void apiGet<AnalyticsBundleDTO>("/api/analytics")
      .then((bundle) => {
        setData(bundle);
        writeAnalyticsCache(bundle);
        setLastUpdated(new Date());
      })
      .catch((err) => {
        setData(null);
        setLoadError(errorToMessage(err, t) || t("analytics.error.load"));
      })
      .finally(() => setRefreshing(false));
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
      <AppHeader
        backHref="/welcome"
        backLabel={t("nav.back")}
        title={t("analytics.page_title")}
        trailing={
          <button
            type="button"
            onClick={() => loadAnalytics()}
            disabled={refreshing || !isAuthenticated}
            className="app-header__action disabled:opacity-40"
            aria-label={t("analytics.refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {lastUpdated && !loadError && (
        <p className="px-4 pb-1 text-center text-[10px] text-zinc-600">
          {t("analytics.updated", {
            time: lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })}
        </p>
      )}

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        {loadError && (
          <InlineAlert
            className="mb-4"
            message={loadError}
            onRetry={loadAnalytics}
            retryLabel={t("common.retry")}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setLoadError(null)}
          />
        )}

        {isAuthenticated && (
          <div className="mb-4">
            {goalsOpen ? (
              <GoalsEditor
                initial={{
                  primaryGoal: home?.goals.primaryGoal ?? null,
                  calorieGoal: today?.calorieGoal ?? home?.goals.calorieGoal ?? 2100,
                  workoutsTarget:
                    today?.workoutsTarget ?? home?.goals.workoutsTarget ?? 5,
                  waterGoalLiters:
                    today?.waterGoalLiters ?? home?.goals.waterGoalLiters ?? 2.5,
                }}
                onCancel={() => setGoalsOpen(false)}
                onSaved={async () => {
                  setGoalsOpen(false);
                  loadAnalytics();
                  await refreshHome();
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setGoalsOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-purple-200 transition hover:bg-white/[0.07]"
              >
                <Target className="h-4 w-4" />
                {t("goals.title")}
              </button>
            )}
          </div>
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
