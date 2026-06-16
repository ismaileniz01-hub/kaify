"use client";

import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { useParallax } from "@/hooks/useParallax";

export function LandingKai() {
  const offset = useParallax(0.18);

  return (
    <section id="kai" className="landing-section landing-section--kai relative overflow-hidden">
      <div
        className="landing-kai-bg-pattern absolute inset-0 opacity-30"
        style={{ transform: `translateY(${offset * 0.5}px)` }}
        aria-hidden
      />

      <div className="landing-container relative z-10">
              <div className="landing-kai-panel focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4" tabIndex={0}>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr]">
            <ScrollReveal direction="left">
              <div className="relative flex flex-col items-center justify-center">
                <div className="landing-kai-aura landing-kai-aura--large" aria-hidden />
                <div
                  className="relative"
                  style={{ transform: `translateY(${-offset}px)` }}
                >
                  <Image
                    src="/kai-level-1.png"
                    alt="Kai — your dragon companion"
                    width={360}
                    height={360}
                    className="landing-kai-float h-auto w-full max-w-xs drop-shadow-[0_32px_100px_rgba(168,85,247,0.5)]"
                  />
                </div>
                {/* Hero'daki Kai avatarı — görselin altında */}
                <div className="relative -mt-12 h-48 w-48 overflow-hidden rounded-full border-[4px] border-purple-500/50 bg-zinc-900 shadow-[0_0_80px_rgba(168,85,247,0.8)]">
                  <Image
                    src="/kai-level-1.png"
                    alt="Kai avatar"
                    width={250}
                    height={250}
                    className="h-full w-full object-contain p-2"
                  />
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={150}>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400">
                Your dragon
              </p>
              <h2 className="landing-section-title mt-4 text-left">
                Meet Kai —{" "}
                <span className="landing-gradient-text">Level 1</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-zinc-400">
                Kai isn&apos;t just cute — he&apos;s the emotional anchor that
                keeps you coming back. Chat when you need encouragement, earn gems
                as you hit goals, and watch your dragon grow as your habits do.
                For the student who needs accountability and the parent who needs
                a gentle nudge — Kai delivers both.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  "New dragon forms unlock as you level up",
                  "Collect neon auras and effects in the Market",
                  "Reach a 31-day streak to unlock Kai Level 2",
                  "Always available — your companion never sleeps",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-300">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
