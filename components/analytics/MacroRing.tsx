"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang-context";

type MacroRingProps = {
  label: string;
  value: string;
  percent: number;
  color: string;
  gradient: "blue" | "green" | "orange";
};

export function MacroRing({ label, value, percent, color, gradient }: MacroRingProps) {
  const { t } = useLang();
  const [displayPercent, setDisplayPercent] = useState(0);
  const r = 28;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    const duration = 1000;
    const steps = 25;
    const stepMs = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayPercent(percent * eased);
      if (progress >= 1) clearInterval(interval);
    }, stepMs);

    return () => clearInterval(interval);
  }, [percent]);

  const offset = c - (displayPercent / 100) * c;

  return (
    <div
      className={`analytics-card analytics-card--${gradient} flex flex-col items-center gap-2 p-3`}
    >
      <div className="relative h-[72px] w-[72px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="6"
          />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
          {Math.round(displayPercent)}%
        </span>
      </div>
      <span className="text-[10px] text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
