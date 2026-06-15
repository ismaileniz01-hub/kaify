"use client";

import Link from "next/link";
import { ArrowLeft, Dumbbell, Home, BookOpen } from "lucide-react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";

export default function LibraryPage() {
  return (
    <div className="phone-shell relative flex flex-col overflow-hidden">
      <FitnessWallpaper softVignette />

      {/* Header */}
      <header className="animate-in animate-in--1 relative z-20 flex items-center justify-between px-4 pt-14">
        <Link
          href="/welcome"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 ring-2 ring-white/15 transition-all duration-300 hover:bg-white/20 hover:text-white hover:scale-110"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/30">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="text-sm font-bold text-white">Library</span>
        </div>
        <div className="h-8 w-8" />
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Title */}
        <section className="animate-in animate-in--2 flex flex-col items-center px-6 pt-8 text-center">
          <h1
            className="text-4xl font-extrabold leading-none tracking-tight text-white drop-shadow-[0_4px_32px_rgba(16,185,129,0.35)]"
            style={{
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            }}
          >
            Exercise Library
          </h1>
          <p className="mt-3 max-w-[280px] text-sm font-medium leading-relaxed text-emerald-100/70">
            Where do you work out?
          </p>
        </section>

        {/* Buttons */}
        <section className="animate-in animate-in--3 mt-10 px-6">
          <div className="flex flex-col gap-4">
            {/* Gym */}
            <Link
              href="/library/gym"
              className="group relative overflow-hidden rounded-2xl border-2 border-white/[0.12] bg-gradient-to-br from-zinc-900/90 to-zinc-900/70 p-6 backdrop-blur-md shadow-2xl shadow-black/30 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-500/10 hover:shadow-2xl active:scale-[0.98]"
            >
              {/* Background glow */}
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl transition-all duration-500 group-hover:bg-emerald-500/20" />

              <div className="relative flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 ring-2 ring-emerald-400/30 transition-all duration-300 group-hover:bg-emerald-500/30 group-hover:ring-emerald-400/50 group-hover:scale-110">
                  <Dumbbell className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white transition-colors duration-300 group-hover:text-emerald-200">
                    Gym
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Exercises with gym equipment
                  </p>
                </div>
              </div>
            </Link>

            {/* Home */}
            <Link
              href="/library/home"
              className="group relative overflow-hidden rounded-2xl border-2 border-white/[0.12] bg-gradient-to-br from-zinc-900/90 to-zinc-900/70 p-6 backdrop-blur-md shadow-2xl shadow-black/30 transition-all duration-300 hover:border-amber-500/40 hover:shadow-amber-500/10 hover:shadow-2xl active:scale-[0.98]"
            >
              {/* Background glow */}
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20" />

              <div className="relative flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 ring-2 ring-amber-400/30 transition-all duration-300 group-hover:bg-amber-500/30 group-hover:ring-amber-400/50 group-hover:scale-110">
                  <Home className="h-8 w-8 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white transition-colors duration-300 group-hover:text-amber-200">
                    Home
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Bodyweight exercises at home
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
