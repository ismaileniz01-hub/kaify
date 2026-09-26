"use client";

import { useLang } from "@/lib/lang-context";
import type { UnitSystem } from "@/lib/lang-context";
import type { LangCode } from "@/lib/lang-context-types";
import { formatNumber } from "@/lib/i18n/format";
import { summarizeWeeklyEnergy } from "@/lib/analytics/weekly-energy";
import type { CalorieDayDTO } from "@/lib/services/analytics.service";

type Props = {
  days?: CalorieDayDTO[] | null;
  calorieGoal: number;
  maintenanceCalories?: number | null;
  onOpenHistory?: () => void;
};

function formatKg(kgDelta: number, unit: UnitSystem, lang: LangCode) {
  const suffix = unit === "imperial" ? "lb" : "kg";
  const value = formatNumber(unit === "imperial" ? kgDelta * 2.205 : kgDelta, lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${kgDelta > 0 ? "+" : ""}${value} ${suffix}`;
}

export function WeeklyEnergyBar({
  days,
  calorieGoal,
  maintenanceCalories,
  onOpenHistory,
}: Props) {
  const { t, lang, unit } = useLang();
  const summary = summarizeWeeklyEnergy(days, {
    calorieGoal,
    maintenanceCalories,
  });
  const clickable = Boolean(onOpenHistory);

  const body = (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80">
      <section className="border-b border-white/10 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-300">
              {t("analytics.weekly_energy.budget_title")}
            </p>
            <p className="mt-1 text-base font-semibold text-white">
              {formatNumber(summary.consumed, lang)} /{" "}
              {formatNumber(summary.budgetTargetToDate, lang)} kcal
            </p>
          </div>
          <p
            className={`mt-1 text-xs font-medium ${
              summary.over > 0 ? "text-rose-300" : "text-emerald-300"
            }`}
          >
            {summary.over > 0
              ? t("analytics.weekly_energy.over", {
                  value: formatNumber(summary.over, lang),
                })
              : t("analytics.weekly_energy.remaining", {
                  value: formatNumber(summary.remaining, lang),
                })}
          </p>
        </div>
      </section>
      <section className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              {t("analytics.weekly_energy.balance_title")}
            </p>
            <p className="mt-1 text-sm text-zinc-200">
              {t("analytics.weekly_energy.burn_total")}:{" "}
              <strong>{formatNumber(summary.energyBurned, lang)} kcal</strong>
            </p>
            <p className="text-xs text-zinc-400">
              {t("analytics.weekly_energy.net")}:{" "}
              <span className={summary.energyBalance > 0 ? "text-rose-300" : "text-blue-200"}>
                {summary.energyBalance > 0 ? "+" : ""}
                {formatNumber(summary.energyBalance, lang)} kcal
              </span>
            </p>
          </div>
          <p className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">
            {t("analytics.weekly_energy.logged_days", {
              logged: summary.loggedDays,
              elapsed: summary.elapsedDays,
            })}
          </p>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          {summary.estimatedWeightChangeKg == null
            ? t("analytics.weekly_energy.estimate_unavailable")
            : t("analytics.weekly_energy.estimate", {
                value: formatKg(summary.estimatedWeightChangeKg, unit, lang),
              })}
        </p>
      </section>
    </div>
  );

  return (
    <div className="mt-3">
      <h2 className="mb-1.5 text-sm font-medium text-white">
        {t("analytics.weekly_energy.title")}
      </h2>
      {clickable ? (
        <button
          type="button"
          onClick={onOpenHistory}
          className="block w-full text-left"
          aria-label={t("analytics.weekly_energy.title")}
        >
          {body}
        </button>
      ) : (
        body
      )}
    </div>
  );
}
