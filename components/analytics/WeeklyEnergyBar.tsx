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
  onOpenHistory?: () => void;
};

function formatKg(kgDelta: number, unit: UnitSystem, lang: LangCode) {
  const absKg = Math.abs(kgDelta);
  const suffix = unit === "imperial" ? "lb" : "kg";
  if (absKg < 0.05) return `0.0 ${suffix}`;
  const value = formatNumber(unit === "imperial" ? absKg * 2.205 : absKg, lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${kgDelta < 0 ? "▼" : "▲"} ${value} ${suffix}`;
}

export function WeeklyEnergyBar({ days, calorieGoal, onOpenHistory }: Props) {
  const { t, lang, unit } = useLang();
  const summary = summarizeWeeklyEnergy(days, calorieGoal);
  const clickable = Boolean(onOpenHistory);

  const cells = [
    {
      key: "eaten",
      label: t("analytics.weekly_energy.eaten"),
      value: formatNumber(summary.eaten, lang),
      unitLabel: "kcal",
      background: "linear-gradient(to top, #4a1a0a 0%, #120c1e 55%, #0a0612 100%)",
      accent: "text-orange-200",
    },
    {
      key: "burned",
      label: t("analytics.weekly_energy.burned"),
      value: formatNumber(summary.burned, lang),
      unitLabel: "kcal",
      background: "linear-gradient(to top, #0f2e18 0%, #0e160e 55%, #0a0612 100%)",
      accent: "text-emerald-200",
    },
    {
      key: "kg",
      label: t("analytics.weekly_energy.kg"),
      value: formatKg(summary.kgDelta, unit, lang),
      unitLabel: "",
      background: "linear-gradient(to top, #1e2a4a 0%, #120c1e 55%, #0a0612 100%)",
      accent: "text-blue-200",
    },
  ] as const;

  const body = (
    <div className="flex min-h-[92px] overflow-hidden rounded-2xl border border-white/10">
      {cells.map((cell, index) => (
        <div
          key={cell.key}
          className={`relative flex min-w-0 flex-1 flex-col justify-center gap-1 px-2.5 py-3 text-center ${
            index > 0 ? "border-l border-white/10" : ""
          }`}
          style={{ background: cell.background }}
        >
          <span
            aria-hidden
            className={`absolute inset-x-0 top-0 h-1 ${
              cell.key === "eaten"
                ? "bg-orange-500"
                : cell.key === "burned"
                  ? "bg-emerald-500"
                  : "bg-blue-500"
            }`}
          />
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            {cell.label}
          </p>
          <p className={`text-[15px] font-semibold leading-tight tracking-tight ${cell.accent}`}>
            {cell.value}
            {cell.unitLabel ? (
              <span className="ml-0.5 text-[10px] font-medium text-zinc-500">
                {cell.unitLabel}
              </span>
            ) : null}
          </p>
        </div>
      ))}
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
