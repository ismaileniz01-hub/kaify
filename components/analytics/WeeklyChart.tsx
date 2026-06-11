"use client";

import { useEffect, useRef, useState } from "react";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const VALUES = [4200, 5800, 5100, 7200, 6400, 8100, 4900];
const MAX = Math.max(...VALUES);
const MIN = Math.min(...VALUES);
const AVG = Math.round(VALUES.reduce((a, b) => a + b, 0) / VALUES.length);

const W = 300;
const H = 100;
const PAD = 8;

function toPoints(values: number[]) {
  const range = MAX - MIN || 1;
  return values
    .map((v, i) => {
      const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((v - MIN) / range) * (H - PAD * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

const linePoints = toPoints(VALUES);
const areaPoints = `${PAD},${H - PAD} ${linePoints} ${W - PAD},${H - PAD}`;

export function WeeklyChart() {
  const polylineRef = useRef<SVGPolylineElement>(null);
  const polygonRef = useRef<SVGPolygonElement>(null);
  const [displayAvg, setDisplayAvg] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(VALUES.map(() => 0));
  const [visibleDots, setVisibleDots] = useState(0);
  const [animatedPoints, setAnimatedPoints] = useState(linePoints);

  useEffect(() => {
    const polyline = polylineRef.current;
    const polygon = polygonRef.current;

    // Önce çizgiyi gizle (stroke-dashoffset ile değil, opacity ile kontrol)
    if (polyline) polyline.style.opacity = "0";
    if (polygon) polygon.style.opacity = "0";

    // Sayı + Bar + Nokta animasyonu
    const duration = 1600;
    const steps = 40;
    const stepMs = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - (1 - progress) * (1 - progress);

      setDisplayAvg(AVG * eased);
      setDisplayPct(12 * eased);
      setBarHeights(VALUES.map((v) => v * eased));
      setVisibleDots(Math.min(Math.floor(progress * VALUES.length) + 1, VALUES.length));

      // Trend line — 0'dan başlayıp dalgalanarak normal haline gelsin
      const range = MAX - MIN || 1;
      const wobble = Math.sin(progress * Math.PI * 4) * (1 - progress) * 20; // sönümlü salınım
      const wobbled = VALUES.map((v, i) => {
        const x = PAD + (i / (VALUES.length - 1)) * (W - PAD * 2);
        const baseY = H - PAD - ((v - MIN) / range) * (H - PAD * 2);
        // Başlangıçta tüm noktalar aynı hizada (düz çizgi), sonra dalgalanarak hedefe oturur
        const startY = H - PAD; // en alt
        const currentY = startY + (baseY - startY) * eased + wobble * (1 - eased);
        return `${x},${currentY}`;
      }).join(" ");

      setAnimatedPoints(wobbled);

      // Çizgiyi progress %5'ten sonra görünür yap
      if (polyline && progress > 0.05) {
        polyline.style.opacity = "1";
        polyline.style.transition = "opacity 0.2s ease-out";
      }

      // Alanı progress %40'tan sonra göster
      if (polygon && progress > 0.4) {
        polygon.style.opacity = "0.85";
        polygon.style.transition = "opacity 0.5s ease-out";
      }

      if (progress >= 1) clearInterval(interval);
    }, stepMs);

    return () => clearInterval(interval);
  }, []);

  const range = MAX - MIN || 1;

  return (
    <div className="analytics-card analytics-card--purple p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">Weekly activity</h2>
        <div className="flex gap-1 rounded-full bg-black/30 p-0.5">
          {(["W", "M", "3M"] as const).map((period) => (
            <button
              key={period}
              type="button"
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                period === "W"
                  ? "bg-purple-500 text-white shadow-sm shadow-purple-500/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-baseline justify-between text-[10px]">
        <span className="text-zinc-500">
          Avg.{" "}
          <span className="font-semibold text-purple-300">
            {Math.round(displayAvg).toLocaleString()}
          </span>{" "}
          steps
        </span>
        <span className="text-emerald-400 font-medium">
          ▲ {Math.round(displayPct)}% vs. last week
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
          {VALUES.map((v, i) => {
            const barW = (W - PAD * 2) / VALUES.length * 0.6;
            const gap = (W - PAD * 2) / VALUES.length;
            const x = PAD + i * gap + (gap - barW) / 2;
            const currentH = ((barHeights[i] - MIN) / range) * (H - PAD * 2) || 0;
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

          {/* Çizgi — 0'dan başlayıp dalgalanarak normal haline gelir */}
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

          {/* Noktalar — sırayla belirir */}
          {VALUES.map((v, i) => {
            const x = PAD + (i / (VALUES.length - 1)) * (W - PAD * 2);
            const y = H - PAD - ((v - MIN) / range) * (H - PAD * 2);
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
        {DAYS.map((day, i) => (
          <span
            key={`${day}-${i}`}
            className={`text-[10px] font-medium ${
              i === 5 ? "text-purple-400" : "text-zinc-600"
            }`}
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}
