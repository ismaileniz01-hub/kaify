"use client";

import Link from "next/link";
import { ArrowLeft, Dumbbell, ChevronRight } from "lucide-react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { useLang } from "@/lib/lang-context";
import {
  GYM_EXERCISE_GROUPS,
  groupColors,
  groupGradients,
  groupIcons,
} from "@/lib/exercise-library";

export default function GymLibraryPage() {
  const { t } = useLang();
  return (
    <div className="phone-shell relative flex flex-col overflow-hidden">
      <FitnessWallpaper softVignette />

      {/* Header */}
      <header className="animate-in animate-in--1 relative z-20 flex items-center justify-between px-4 pt-14">
        <Link
          href="/library"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 ring-2 ring-white/15 transition-all duration-300 hover:bg-white/20 hover:text-white hover:scale-110"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/30">
            <Dumbbell className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="text-sm font-bold text-white">{t("library.gym")}</span>
        </div>
        <div className="h-8 w-8" />
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Title */}
        <section className="animate-in animate-in--2 flex flex-col items-center px-6 pt-8 text-center">
          <h1
            className="text-3xl font-extrabold leading-none tracking-tight text-white drop-shadow-[0_4px_32px_rgba(16,185,129,0.35)]"
            style={{
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}
          >
            {t("library.gym.title")}
          </h1>
          <p className="mt-3 max-w-[280px] text-sm font-medium leading-relaxed text-emerald-100/70">
            {t("library.gym.subtitle")}
          </p>
        </section>

        {/* Groups */}
        <section className="animate-in animate-in--3 mt-6 px-4 pb-10 space-y-4">
          {GYM_EXERCISE_GROUPS.map((group, gi) => (
            <div
              key={group.id}
              className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-b shadow-xl shadow-black/40 transition-all duration-300 ${groupGradients[group.id]}`}
              style={{ animationDelay: `${(gi + 1) * 80}ms` }}
            >
              {/* Group header */}
              <div className={`flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 ${groupColors[group.id]}`}>
                <span className="text-lg">{groupIcons[group.id]}</span>
                <h2 className="text-sm font-bold text-white">{t(`exercise.${group.id}`)}</h2>
              </div>

              {/* Exercise list */}
              <div className="divide-y divide-white/[0.04]">
                {group.exercises.map((exercise, ei) => (
                  <div
                    key={exercise.key}
                    className="group flex items-center justify-between px-4 py-2.5 transition-all duration-200 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                        <span className="text-[10px] font-bold text-zinc-500">{ei + 1}</span>
                      </div>
                      <span className="text-sm text-zinc-300 transition-colors duration-200 group-hover:text-white">
                        {t(exercise.key)}
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition-all duration-200 group-hover:text-emerald-400 group-hover:translate-x-0.5" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
