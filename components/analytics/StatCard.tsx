"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useLang } from "@/lib/lang-context";

type GradientVariant = "blue" | "orange" | "green" | "purple" | "water";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  /** When set, bypasses string parsing (avoids TR "1.840" → 1.84 bugs). */
  numericValue?: number;
  unitSuffix?: string;
  trend: string;
  trendPositive?: boolean;
  barColor: string;
  barPercent: number;
  gradient: GradientVariant;
  /** When false, counters stay at zero until triggered */
  animate?: boolean;
};

/** Sayısal kısmı ve birimi ayır — örn "78.4 kg" → [78.4, "kg"] */
function parseValue(v: string): [number, string] {
  const match = v.match(/^([\d.,]+)\s*(.*)/);
  if (!match) return [0, v];
  const num = parseFloat(match[1].replace(",", "."));
  return [isNaN(num) ? 0 : num, match[2]];
}

export function StatCard({
  icon: Icon,
  label,
  value,
  numericValue,
  unitSuffix,
  trend,
  trendPositive = true,
  barColor,
  barPercent,
  gradient,
  animate = true,
}: StatCardProps) {
  const { t } = useLang();
  const [displayNum, setDisplayNum] = useState(0);
  const [displayBar, setDisplayBar] = useState(0);
  const parsed = parseValue(value);
  const targetNum = numericValue ?? parsed[0];
  const unit = unitSuffix ?? parsed[1];

  useEffect(() => {
    if (!animate) {
      setDisplayNum(0);
      setDisplayBar(0);
      return;
    }

    const duration = 1400;
    const steps = 40;
    const stepMs = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayNum(targetNum * eased);
      setDisplayBar(barPercent * eased);
      if (progress >= 1) clearInterval(interval);
    }, stepMs);

    return () => clearInterval(interval);
  }, [targetNum, barPercent, animate]);

  const formattedNum =
    targetNum % 1 === 0
      ? Math.round(displayNum).toLocaleString()
      : displayNum.toFixed(1);

  return (
    <div className={`analytics-card analytics-card--${gradient} relative z-0 flex flex-col gap-2 p-3.5`}>
      <div className="flex items-center gap-1.5 text-zinc-400">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold tracking-tight text-white">
        {formattedNum} {unit}
      </p>
      <p
        className={`text-[10px] font-medium ${
          trendPositive ? "text-emerald-400" : "text-zinc-400"
        }`}
      >
        {trend}
      </p>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${displayBar}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
