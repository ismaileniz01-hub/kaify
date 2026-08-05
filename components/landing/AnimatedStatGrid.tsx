"use client";

import { Activity, Droplets, Dumbbell, Flame } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { StatCard } from "@/components/analytics/StatCard";
import { useLang } from "@/lib/lang-context";

export function AnimatedStatGrid() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold: 0.25 });
  const { t, unit } = useLang();

  const STATS = [
    {
      icon: Activity,
      label: t("analytics.weight"),
      value: unit === "metric" ? "78.4 kg" : "172.8 lbs",
      trend: t("analytics.weight.trend", {
        value: unit === "metric" ? "1.2 kg" : "2.6 lbs",
      }),
      barColor: "#3b82f6",
      barPercent: 72,
      gradient: "blue" as const,
    },
    {
      icon: Flame,
      label: t("analytics.calories"),
      value: "1.8k",
      trend: t("analytics.calories.trend"),
      barColor: "#f97316",
      barPercent: 85,
      gradient: "orange" as const,
    },
    {
      icon: Dumbbell,
      label: t("analytics.workouts"),
      value: "4 / 5",
      trend: t("analytics.workouts.trend"),
      barColor: "#22c55e",
      barPercent: 80,
      gradient: "green" as const,
    },
    {
      icon: Droplets,
      label: t("analytics.water"),
      value: "2.1 L",
      trend: t("analytics.hydration.trend", { percent: 82 }),
      barColor: "#06b6d4",
      barPercent: 82,
      gradient: "water" as const,
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 gap-4">
      {STATS.map((stat) => (
        <StatCard key={stat.label} {...stat} animate={visible} />
      ))}
    </div>
  );
}


