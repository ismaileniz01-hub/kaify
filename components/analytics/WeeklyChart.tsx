"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { formatNumber } from "@/lib/i18n/format";
import {
  buildStepsChart,
  periodAvailable,
  type StepsPeriod,
  type StepsPoint,
} from "@/lib/analytics/steps-chart";

const W = 300;
const H = 100;
const PAD = 8;

function toPoints(values: number[]) {
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = PAD + (index / Math.max(values.length - 1, 1)) * (W - PAD * 2);
      const y = H - PAD - ((value - min) / range) * (H - PAD * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function WeeklyChart({ stepsData }: { stepsData?: StepsPoint[] }) {
  const { t, lang } = useLang();
  const [period, setPeriod] = useState<StepsPeriod>("W");
  const view = useMemo(
    () => buildStepsChart(stepsData ?? [], period, lang),
    [stepsData, period, lang],
  );

  const max = Math.max(...(view?.values ?? [0]), 1);

  return (
    <div className="analytics-card analytics-card--purple p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">{t("analytics.weekly_chart")}</h2>
        <div className="flex gap-1 rounded-full bg-black/30 p-0.5">
          {(["W", "M", "3M"] as const).map((item) => {
            const enabled = periodAvailable(stepsData ?? [], item);
            return (
              <button
                key={item}
                type="button"
                disabled={!enabled}
                onClick={() => setPeriod(item)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                  period === item
                    ? "bg-purple-500 text-white shadow-sm shadow-purple-500/40"
                    : "text-zinc-500 hover:text-zinc-300 disabled:text-zinc-700 disabled:hover:text-zinc-700"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {!view ? (
        <p className="py-8 text-center text-xs text-zinc-500">
          {t("analytics.steps_empty")}
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between text-[10px]">
            <span className="text-zinc-500">
              {t("analytics.avg_steps")}{" "}
              <span className="font-semibold text-purple-300">
                {formatNumber(view.avg, lang)}
              </span>{" "}
              {t("analytics.steps")}
            </span>
            <span className="font-medium text-emerald-400">
              {view.trendPct == null
                ? t("analytics.no_trend")
                : t(
                    period === "W"
                      ? "analytics.vs_week"
                      : period === "M"
                        ? "analytics.vs_month"
                        : "analytics.vs_quarter",
                    { percent: Math.abs(view.trendPct) },
                  )}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-32 w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label={t("analytics.weekly_chart")}
          >
            {view.values.map((value, index) => {
              const barW = ((W - PAD * 2) / view.values.length) * 0.6;
              const gap = (W - PAD * 2) / view.values.length;
              const x = PAD + index * gap + (gap - barW) / 2;
              const height = (value / max) * (H - PAD * 2);
              return (
                <rect
                  key={`${view.labels[index]}-${index}`}
                  x={x}
                  y={H - PAD - height}
                  width={barW}
                  height={height}
                  fill="rgba(168, 85, 247, 0.35)"
                  rx="2"
                />
              );
            })}
            <polyline
              points={toPoints(view.values)}
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-2 flex justify-between px-0.5">
            {view.labels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className={`text-[10px] font-medium ${
                  index === view.labels.length - 1 ? "text-purple-400" : "text-zinc-600"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
