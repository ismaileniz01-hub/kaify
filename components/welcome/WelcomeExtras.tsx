"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Sparkles, BookOpen } from "lucide-react";
import { useKai } from "@/lib/kai-context";
import { getKaiLevelInfo } from "@/lib/kai-level";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { useEffect } from "react";

export function WelcomeExtras() {
  const { t, lang } = useLang();
  const { avatar: kaiAvatar, unlockedLevel, unlockLevel } = useKai();
  const { home, refreshHome } = useSession();

  useEffect(() => {
    void refreshHome();
  }, [lang, refreshHome]);

  useEffect(() => {
    if (home?.kaiLevel && home.kaiLevel > unlockedLevel) {
      unlockLevel(home.kaiLevel as 1 | 2 | 3 | 4);
    }
  }, [home?.kaiLevel, unlockedLevel, unlockLevel]);

  const kaiInfo = getKaiLevelInfo(home?.kaiLevel ?? unlockedLevel);
  const streak = home?.stats.streak ?? 0;
  const stepsLabel =
    home?.stats.steps != null
      ? `${(home.stats.steps / 1000).toFixed(1)}k`
      : "—";
  const goalLabel =
    home?.stats.goalPercent != null ? `${home.stats.goalPercent}%` : "—";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="analytics-card analytics-card--purple px-2.5 py-2.5 text-center">
          <p className="text-[10px] text-zinc-500">{t("home.today")}</p>
          <p className="text-sm font-bold text-white">{stepsLabel}</p>
          <p className="text-[9px] text-purple-300">{t("home.steps")}</p>
        </div>
        <div className="analytics-card analytics-card--orange px-2.5 py-2.5 text-center">
          <p className="text-[10px] text-zinc-500">{t("nav.streak")}</p>
          <p className="text-sm font-bold text-white">{streak}</p>
          <p className="text-[9px] text-orange-300">{t("home.day")}</p>
        </div>
        <div className="analytics-card analytics-card--green px-2.5 py-2.5 text-center">
          <p className="text-[10px] text-zinc-500">{t("home.goal")}</p>
          <p className="text-sm font-bold text-white">{goalLabel}</p>
          <p className="text-[9px] text-emerald-300">{t("home.completed")}</p>
        </div>
      </div>

      <div className="analytics-card analytics-card--purple flex items-start gap-3 p-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/25 text-purple-300">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-purple-300">{t("home.tip")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-300">
            {home?.dailyTip ?? t("home.tip.text")}
          </p>
        </div>
      </div>

      {home?.kaiFoodInsight && (
        <div className="analytics-card analytics-card--orange flex items-start gap-3 p-3.5">
          <div className="relative h-9 w-9 shrink-0">
            <Image
              src={kaiAvatar}
              alt="Kai"
              width={36}
              height={36}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-orange-300">{t("home.kai_food_title")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-300">{home.kaiFoodInsight}</p>
          </div>
        </div>
      )}

      <Link
        href="/chat/kai"
        className="analytics-card analytics-card--blue flex items-center gap-3 p-3.5 transition active:scale-[0.99]"
      >
        <div className="relative h-11 w-11 shrink-0">
          <Image
            src={kaiAvatar}
            alt="Kai"
            width={44}
            height={44}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-zinc-500">
            {t("home.kai_level", { level: kaiInfo.level, label: t(kaiInfo.labelKey) })}
          </p>
          <p className="text-sm font-semibold text-white">{t("home.chat_with_kai")}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
      </Link>

      <Link
        href="/library"
        className="analytics-card analytics-card--emerald flex items-center gap-3 p-3.5 transition active:scale-[0.99]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/25 text-emerald-300">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-zinc-500">{t("home.exercise_library")}</p>
          <p className="text-sm font-semibold text-white">{t("home.explore_exercises")}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
      </Link>
    </div>
  );
}
