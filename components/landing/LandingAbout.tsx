"use client";

import { BarChart3, Flame, MessageCircle, ShoppingCart, Sparkles, Zap } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const PILLARS = [
  {
    icon: BarChart3,
    title: "Analytics",
    subtitle: "See real progress",
    desc: "Weight, calories, workouts, hydration — tracked automatically so you always know where you stand, not where you guess you are.",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.35)",
  },
  {
    icon: MessageCircle,
    title: "Coaching",
    subtitle: "Talk to your team",
    desc: "Ask Alex about your workout. Get meal plans from Dr. Maya. Review posture with Leo. Real answers, instantly — no booking calls.",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.35)",
  },
  {
    icon: Flame,
    title: "Streaks",
    subtitle: "Build the habit",
    desc: "The #1 reason people quit? They stop showing up. Daily streaks turn consistency into something you can see — and Kai evolves as you do.",
    color: "#f97316",
    glow: "rgba(249, 115, 22, 0.35)",
  },
  {
    icon: ShoppingCart,
    title: "Rewards",
    subtitle: "Stay motivated",
    desc: "Earn gems, unlock Kai's new looks, and celebrate milestones. Positive reinforcement that actually works — for teens and parents alike.",
    color: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.35)",
  },
];

export function LandingAbout() {
  return (
    <section id="about" className="landing-section relative">
      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400">
            Why K.AIFY
          </p>
          <h2 className="landing-section-title mt-4">
            4 Expert Coaches,{" "}
            <span className="landing-gradient-text">One Team,</span>
            {" "}Built For You
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Most fitness apps dump data on you and disappear. K.AIFY is different:
            a polished experience with coaches who guide you, analytics that make
            sense, and a companion dragon who makes the journey feel human. Built
            for busy professionals, students, and parents who want results without
            the complexity.
          </p>
        </ScrollReveal>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => (
            <ScrollReveal key={pillar.title} delay={i * 100} direction="up">
              <article
                className="landing-pillar-card group focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-4 focus-visible:ring-4 focus-visible:ring-purple-500/20"
                tabIndex={0}
                style={
                  {
                    "--pillar-color": pillar.color,
                    "--pillar-glow": pillar.glow,
                  } as React.CSSProperties
                }
              >
                <div className="landing-pillar-icon">
                  <pillar.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-white">{pillar.title}</h3>
                <p className="mt-1 text-sm font-medium text-purple-300/70">
                  {pillar.subtitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  {pillar.desc}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>

        {/* Fiyatlandırma — About bölümünün sonunda */}
        <ScrollReveal direction="up" delay={200}>
          <div className="mx-auto mt-16 max-w-2xl text-center">
            <p className="text-sm text-zinc-500">
              Plans starting from{" "}
              <span className="relative inline-block font-semibold text-zinc-300">
                <span className="absolute -inset-x-1 -inset-y-0.5 rounded-md bg-emerald-500/10 blur-sm" />
                <span className="relative">just $14.99/mo</span>
              </span>{" "}
              {" "}&mdash; that's less than a coffee run for a whole month of personalized coaching.
            </p>

            <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                <span className="text-xs sm:text-sm font-semibold text-emerald-300">
                  <span className="text-emerald-200">10% OFF</span> for all subscribers
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
                <span className="text-xs sm:text-sm font-semibold text-amber-300">
                  First <span className="text-amber-200">100</span> get{" "}
                  <span className="text-amber-200">lifetime 2% OFF</span>
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
