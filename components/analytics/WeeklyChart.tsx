"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang-context";

type Period = "W" | "M" | "3M";

type StepsPoint = { date: string; steps: number };

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const PERIOD_DATA: Record<Period, { labels: string[]; values: number[] }> = {
  W: {
    labels: ["M", "T", "W", "T", "F", "S", "S"],
    values: [4200, 5800, 5100, 7200, 6400, 8100, 4900],
  },
  M: {
    labels: ["W1", "W2", "W3", "W4"],
    values: [38500, 41200, 39800, 45600],
  },
  "3M": {
    labels: ["Jan", "Feb", "Mar"],
    values: [158000, 165000, 172000],
  },
};

const W = 300;
const H = 100;
const PAD = 8;

function toPoints(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function WeeklyChart({ stepsData }: { stepsData?: StepsPoint[] }) {
  const { t } = useLang();
  const [period, setPeriod] = useState<Period>("W");
  const polylineRef = useRef<SVGPolylineElement>(null);
  const polygonRef = useRef<SVGPolygonElement>(null);
  const [displayAvg, setDisplayAvg] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>([]);
  const [visibleDots, setVisibleDots] = useState(0);
  const [animatedPoints, setAnimatedPoints] = useState("");

  const liveWeek =
    stepsData && stepsData.length > 0
      ? {
          labels: stepsData.map((d) => {
            const day = new Date(`${d.date}T12:00:00`).getDay();
            return DAY_LABELS[day] ?? "D";
          }),
          values: stepsData.map((d) => d.steps),
        }
      : null;

  const data = period === "W" && liveWeek ? liveWeek : PERIOD_DATA[period];
  const max = Math.max(...data.values);
  const min = Math.min(...data.values);
  const range = max - min || 1;
  const avg = Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length);
  const linePoints = toPoints(data.values);
  const areaPoints = `${PAD},${H - PAD} ${linePoints} ${W - PAD},${H - PAD}`;

  useEffect(() => {
    const polyline = polylineRef.current;
    const polygon = polygonRef.current;

    if (polyline) polyline.style.opacity = "0";
    if (polygon) polygon.style.opacity = "0";

    const duration = 1600;
    const steps = 40;
    const stepMs = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - (1 - progress) * (1 - progress);

      setDisplayAvg(avg * eased);
      setDisplayPct(12 * eased);
      setBarHeights(data.values.map((v) => v * eased));
      setVisibleDots(Math.min(Math.floor(progress * data.values.length) + 1, data.values.length));

      // Trend line — 0'dan başlayıp dalgalanarak normal haline gelsin
      const wobble = Math.sin(progress * Math.PI * 4) * (1 - progress) * 20;
      const wobbled = data.values.map((v, i) => {
        const x = PAD + (i / (data.values.length - 1)) * (W - PAD * 2);
        const baseY = H - PAD - ((v - min) / range) * (H - PAD * 2);
        const startY = H - PAD;
        const currentY = startY + (baseY - startY) * eased + wobble * (1 - eased);
        return `${x},${currentY}`;
      }).join(" ");

      setAnimatedPoints(wobbled);

      if (polyline && progress > 0.05) {
        polyline.style.opacity = "1";
        polyline.style.transition = "opacity 0.2s ease-out";
      }

      if (polygon && progress > 0.4) {
        polygon.style.opacity = "0.85";
        polygon.style.transition = "opacity 0.5s ease-out";
      }

      if (progress >= 1) clearInterval(interval);
    }, stepMs);

    return () => clearInterval(interval);
  }, [period, data, avg, min, range]);

  return (
    <div className="analytics-card analytics-card--purple p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">{t("analytics.weekly_chart")}</h2>
        <div className="flex gap-1 rounded-full bg-black/30 p-0.5">
          {(["W", "M", "3M"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                period === p
                  ? "bg-purple-500 text-white shadow-sm shadow-purple-500/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-baseline justify-between text-[10px]">
        <span className="text-zinc-500">
          {t("analytics.avg_steps")}{" "}
          <span className="font-semibold text-purple-300">
            {Math.round(displayAvg).toLocaleString()}
          </span>{" "}
          {t("analytics.steps")}
        </span>
        <span className="text-emerald-400 font-medium">
          {period === "W" ? t("analytics.vs_week", { percent: Math.round(displayPct) }) : period === "M" ? t("analytics.vs_month", { percent: Math.round(displayPct) }) : t("analytics.vs_quarter", { percent: Math.round(displayPct) })}
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-32 w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          {/* Arka plan çizgileri */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={PAD}
              y1={PAD + (i * (H - PAD * 2)) / 3}
              x2={W - PAD}
              y2={PAD + (i * (H - PAD * 2)) / 3}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          {/* Bar'lar — 0'dan yükseklik animasyonu */}
          {data.values.map((v, i) => {
            const barW = (W - PAD * 2) / data.values.length * 0.6;
            const gap = (W - PAD * 2) / data.values.length;
            const x = PAD + i * gap + (gap - barW) / 2;
            const currentH = ((barHeights[i] || 0) - min) / range * (H - PAD * 2) || 0;
            const y = H - PAD - currentH;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={currentH}
                fill="rgba(168, 85, 247, 0.15)"
                rx="2"
              />
            );
          })}

          {/* Alan */}
          <polygon
            ref={polygonRef}
            points={areaPoints}
            fill="url(#activityGradient)"
            opacity={0}
          />

          {/* Çizgi */}
          <polyline
            ref={polylineRef}
            points={animatedPoints}
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0}
          />

          {/* Noktalar */}
          {data.values.map((v, i) => {
            const x = PAD + (i / (data.values.length - 1)) * (W - PAD * 2);
            const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
            const isVisible = i < visibleDots;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3.5"
                fill="#e9d5ff"
                stroke="#a855f7"
                strokeWidth="1.5"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transition: "opacity 0.15s ease-out",
                }}
              />
            );
          })}

          <defs>
            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.45)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="mt-2 flex justify-between px-0.5">
        {data.labels.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className={`text-[10px] font-medium ${
              i === data.labels.length - 1 ? "text-purple-400" : "text-zinc-600"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
