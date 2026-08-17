"use client";

import type { CalorieDayDTO } from "@/lib/services/analytics.service";
import { useLang } from "@/lib/lang-context";
import { formatNumber } from "@/lib/i18n/format";

export function CalorieHistorySheet({
  days,
  onClose,
}: {
  days: CalorieDayDTO[];
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const hasAny = days.some(
    (d) => d.caloriesConsumed > 0 || d.caloriesBurned > 0 || d.workoutsCompleted > 0,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calorie-history-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="calorie-history-title" className="text-sm font-semibold text-white">
            {t("analytics.history.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-white"
          >
            {t("analytics.history.close")}
          </button>
        </div>
        {!hasAny ? (
          <p className="text-xs text-zinc-500">{t("analytics.history.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...days].reverse().map((day) => {
              const net = day.caloriesConsumed - day.caloriesBurned;
              return (
                <li
                  key={day.date}
                  className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                >
                  <p className="text-[11px] font-medium text-zinc-400">{day.date}</p>
                  <p className="mt-1 text-xs text-zinc-200">
                    {t("analytics.history.eaten")}: {formatNumber(day.caloriesConsumed, lang)}{" "}
                    kcal
                  </p>
                  <p className="text-xs text-emerald-300">
                    {t("analytics.history.burned")}: {formatNumber(day.caloriesBurned, lang)}{" "}
                    kcal
                    {day.workoutsCompleted > 0
                      ? ` · ${t("analytics.history.workouts")}: ${day.workoutsCompleted}`
                      : ""}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {t("analytics.history.net")}: {formatNumber(net, lang)} kcal
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
