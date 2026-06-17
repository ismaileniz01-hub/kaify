"use client";

import { BarChart3, Flame, MessageCircle, ShoppingCart } from "lucide-react";
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

        {/* ── Fiyat Karşılaştırma Kartı ── */}
        <ScrollReveal className="mt-16" delay={200}>
          <div className="landing-feature-panel landing-feature-panel--animated relative overflow-hidden">
            {/* Arka plan ışıltısı */}
            <div className="pointer-events-none absolute -inset-20 opacity-30">
              <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/20 blur-[100px]" />
              <div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-cyan-500/10 blur-[80px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-2xl">
              {/* Başlık */}
              <div className="mb-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400/80">
                  Value comparison
                </p>
                <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                  What you'd pay elsewhere{" "}
                  <span className="landing-gradient-text">vs. Kaify</span>
                </h3>
              </div>

              {/* Karşılaştırma satırları */}
              <div className="space-y-3">
                {[
                  { label: "Personal Trainer", price: "$50+", delay: 0, icon: "🏋️" },
                  { label: "Nutrition Coach", price: "$40+", delay: 100, icon: "🥗" },
                  { label: "Calorie Tracking", price: "$10+", delay: 150, icon: "📊" },
                  { label: "Posture Coach", price: "$40+", delay: 200, icon: "🧍" },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-all duration-500 hover:border-purple-500/30 hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(168,85,247,0.08)]"
                    style={{ animation: `fade-in-up 0.5s ease-out ${item.delay}ms both` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-sm text-red-400">
                        ✕
                      </span>
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-sm font-medium text-zinc-300">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-red-400">{item.price}</span>
                  </div>
                ))}
              </div>

              {/* Ayırıcı */}
              <div className="relative my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-sm text-purple-400">
                  ↓
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
              </div>

              {/* Kaify fiyatı */}
              <div className="group relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-transparent p-6 transition-all duration-500 hover:border-purple-400/40 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]">
                {/* Animasyonlu parıltı */}
                <div className="pointer-events-none absolute -inset-20 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                  <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400/20 blur-[60px]" />
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 text-lg text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                      ✓
                    </span>
                    <div>
                      <p className="text-lg font-bold text-white">Kaify</p>
                      <p className="text-xs text-zinc-500">All-in-one fitness platform</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold text-white">
                      $14.99
                    </p>
                    <p className="text-xs text-zinc-500">starting from</p>
                  </div>
                </div>

                {/* Tasarruf etiketi */}
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2">
                  <span className="text-sm text-green-400">💰</span>
                  <span className="text-xs font-semibold text-green-400">
                    Save up to <span className="text-sm">$125+/month</span> · <span className="text-sm">$1,500+/year</span> compared to hiring individual coaches
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
