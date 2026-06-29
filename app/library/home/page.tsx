"use client";

import Link from "next/link";
import { ArrowLeft, Home, ChevronRight } from "lucide-react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { useLang } from "@/lib/lang-context";

const EXERCISE_GROUPS = [
  {
    id: "chest",
    nameKey: "library.home.group.chest",
    exercises: [
      "Wide Grip Push-ups",
      "Diamond Push-ups",
      "Decline Push-ups",
      "Archer Push-ups",
      "Floor Press",
    ],
  },
  {
    id: "shoulders",
    nameKey: "library.home.group.shoulders",
    exercises: [
      "Pike Push-ups",
      "Wall Walk",
      "Dolphin Push-ups",
      "Side Lateral Raise",
      "Front Raise",
    ],
  },
  {
    id: "back",
    nameKey: "library.home.group.back",
    exercises: [
      "Superman",
      "Reverse Snow Angels",
      "Doorway Rows",
      "Inverted Rows",
      "Swimmers",
    ],
  },
  {
    id: "legs",
    nameKey: "library.home.group.legs",
    exercises: [
      "Wall Sit",
      "Jump Squats",
      "Curtsy Lunges",
      "Side Lunges",
      "Glute Bridges",
    ],
  },
  {
    id: "arms",
    nameKey: "library.home.group.arms",
    exercises: [
      "Triceps Dips",
      "Chair Push-ups",
      "Bicep Curls",
      "Hammer Curls",
    ],
  },
  {
    id: "core",
    nameKey: "library.home.group.core",
    exercises: [
      "Bicycle Crunches",
      "Leg Raises",
      "Flutter Kicks",
      "Mountain Climbers",
      "Plank Jacks",
    ],
  },
];

const groupColors: Record<string, string> = {
  chest: "border-blue-500/60",
  back: "border-emerald-500/60",
  shoulders: "border-purple-500/60",
  arms: "border-orange-500/60",
  legs: "border-rose-500/60",
  core: "border-amber-500/60",
};

const groupGradients: Record<string, string> = {
  chest: "from-blue-950/60 via-zinc-900 to-zinc-900",
  back: "from-emerald-950/60 via-zinc-900 to-zinc-900",
  shoulders: "from-purple-950/60 via-zinc-900 to-zinc-900",
  arms: "from-orange-950/60 via-zinc-900 to-zinc-900",
  legs: "from-rose-950/60 via-zinc-900 to-zinc-900",
  core: "from-amber-950/60 via-zinc-900 to-zinc-900",
};

const groupIcons: Record<string, string> = {
  chest: "🫀",
  back: "🦍",
  shoulders: "💪",
  arms: "💪",
  legs: "🦵",
  core: "🔥",
};

export default function HomeLibraryPage() {
  const { t } = useLang();
  return (
    <div className="phone-shell relative flex flex-col overflow-hidden">
      <FitnessWallpaper softVignette />

      {/* Header */}
      <header className="animate-in animate-in--1 relative z-20 flex items-center justify-between px-4 pt-14">
        <Link
          href="/library"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 ring-2 ring-white/15 transition-all duration-300 hover:bg-white/20 hover:text-white hover:scale-110"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-400/30">
            <Home className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-bold text-white">{t("library.home")}</span>
        </div>
        <div className="h-8 w-8" />
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Title */}
        <section className="animate-in animate-in--2 flex flex-col items-center px-6 pt-8 text-center">
          <h1
            className="text-3xl font-extrabold leading-none tracking-tight text-white drop-shadow-[0_4px_32px_rgba(245,158,11,0.35)]"
            style={{
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}
          >
            {t("library.home.title")}
          </h1>
          <p className="mt-3 max-w-[280px] text-sm font-medium leading-relaxed text-amber-100/70">
            {t("library.home.subtitle")}
          </p>
        </section>

        {/* Groups */}
        <section className="animate-in animate-in--3 mt-6 px-4 pb-10 space-y-4">
          {EXERCISE_GROUPS.map((group, gi) => (
            <div
              key={group.id}
              className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-b shadow-xl shadow-black/40 transition-all duration-300 ${groupGradients[group.id]}`}
              style={{ animationDelay: `${(gi + 1) * 80}ms` }}
            >
              {/* Group header */}
              <div className={`flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 ${groupColors[group.id]}`}>
                <span className="text-lg">{groupIcons[group.id]}</span>
                <h2 className="text-sm font-bold text-white">{t(group.nameKey)}</h2>
              </div>

              {/* Exercise list */}
              <div className="divide-y divide-white/[0.04]">
                {group.exercises.map((exercise, ei) => (
                  <div
                    key={ei}
                    className="group flex items-center justify-between px-4 py-2.5 transition-all duration-200 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                        <span className="text-[10px] font-bold text-zinc-500">{ei + 1}</span>
                      </div>
                      <span className="text-sm text-zinc-300 transition-colors duration-200 group-hover:text-white">
                        {exercise}
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition-all duration-200 group-hover:text-amber-400 group-hover:translate-x-0.5" />
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
