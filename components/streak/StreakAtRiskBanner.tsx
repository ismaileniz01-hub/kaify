"use client";

import Link from "next/link";
import { AlertTriangle, Flame, Snowflake } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { computeStreakDrama } from "@/lib/streak-drama";

type Props = {
  currentStreak: number;
  lastCheckInDate: string | null;
  freezieBalance: number;
};

export function StreakAtRiskBanner({
  currentStreak,
  lastCheckInDate,
  freezieBalance,
}: Props) {
  const { t } = useLang();
  const drama = computeStreakDrama({ currentStreak, lastCheckInDate, freezieBalance });

  if (drama.variant === "none") return null;

  const variant = drama.variant;
  const configs = {
    at_risk: {
      icon: Flame,
      gradient: "from-orange-950/60 to-red-950/40 border-orange-400/40",
      titleKey: "streak.drama.at_risk.title",
      bodyKey: "streak.drama.at_risk.body",
      iconClass: "text-orange-400",
    },
    freezie_save: {
      icon: Snowflake,
      gradient: "from-cyan-950/50 to-blue-950/40 border-cyan-400/40",
      titleKey: "streak.drama.freezie.title",
      bodyKey: "streak.drama.freezie.body",
      iconClass: "text-cyan-300",
    },
    lost_day: {
      icon: AlertTriangle,
      gradient: "from-red-950/60 to-zinc-950/40 border-red-500/40",
      titleKey: "streak.drama.lost.title",
      bodyKey: "streak.drama.lost.body",
      iconClass: "text-red-400",
    },
  } as const;

  const config = configs[variant];

  const Icon = config.icon;

  return (
    <Link
      href="/streak"
      className={`streak-drama-pulse block rounded-2xl border bg-gradient-to-r p-4 transition active:scale-[0.99] ${config.gradient}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/25 ${config.iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">
            {t(config.titleKey, { streak: currentStreak })}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">
            {t(config.bodyKey, { streak: currentStreak, days: drama.daysSinceCheckIn })}
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
            {t("streak.drama.cta")}
          </p>
        </div>
      </div>
    </Link>
  );
}
