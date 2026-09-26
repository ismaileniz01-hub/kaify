"use client";

import { Home } from "lucide-react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { useLang } from "@/lib/lang-context";
import { AppHeader } from "@/components/navigation/AppHeader";
import { ExerciseGroupList } from "@/components/library/ExerciseGroupList";
import { HOME_EXERCISE_GROUPS } from "@/lib/exercise-library";

export default function HomeLibraryPage() {
  const { t } = useLang();
  return (
    <div className="phone-shell relative flex flex-col overflow-hidden">
      <FitnessWallpaper softVignette />

      <AppHeader
        backHref="/library"
        backLabel={t("nav.back")}
        title={
          <span className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-400/30">
            <Home className="h-3.5 w-3.5 text-amber-400" />
          </div>
            <span>{t("library.home")}</span>
          </span>
        }
      />

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

        <section className="animate-in animate-in--3 mt-6 space-y-4 px-4 pb-10">
          <ExerciseGroupList groups={HOME_EXERCISE_GROUPS} place="home" />
        </section>
      </main>
    </div>
  );
}
