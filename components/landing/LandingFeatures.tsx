"use client";

import { ScrollReveal } from "./ScrollReveal";
import { AnimatedStatGrid } from "./AnimatedStatGrid";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import { MacroRing } from "@/components/analytics/MacroRing";
import { useScrollReveal } from "@/hooks/useScrollReveal";

function AnimatedMacros() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <div ref={ref} className="grid grid-cols-3 gap-6">
      <MacroRing label="Protein" value="142g" percent={visible ? 72 : 0} color="#3b82f6" gradient="blue" />
      <MacroRing label="Carbs" value="210g" percent={visible ? 55 : 0} color="#22c55e" gradient="green" />
      <MacroRing label="Fat" value="58g" percent={visible ? 80 : 0} color="#f97316" gradient="orange" />
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section id="features" className="landing-section relative overflow-hidden">
      <div className="landing-section-glow landing-section-glow--cyan" aria-hidden />

      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400/80">
            Analytics
          </p>
          <h2 className="landing-section-title mt-4">
            Body tracking{" "}
            <span className="landing-gradient-text">that finally sticks.</span>
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            No spreadsheets. No confusion. Watch your weight, calories, workouts,
            and hydration come alive as you scroll — because seeing progress is
            what keeps you going.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid items-start gap-8 sm:mt-20 lg:grid-cols-12">
          <ScrollReveal className="lg:col-span-5" delay={0}>
            <AnimatedStatGrid />
          </ScrollReveal>

          <ScrollReveal className="lg:col-span-7" delay={150} direction="right">
            <div className="landing-feature-panel landing-feature-panel--animated">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Weekly activity</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Avg. <span className="text-green-400">5,957 steps</span> · 12% up
                  </p>
                </div>
                <div className="flex gap-2">
                  {["W", "M", "3M"].map((label, i) => (
                    <span
                      key={label}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500 ${
                        i === 0
                          ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                          : "bg-white/5 text-zinc-500"
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <WeeklyChart />
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal className="mt-12" delay={200}>
          <div className="landing-feature-panel landing-feature-panel--animated">
            <p className="mb-6 text-sm font-semibold text-white">Daily macros</p>
            <AnimatedMacros />
          </div>
        </ScrollReveal>

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
                  { label: "Personal Trainer", price: "$50+", delay: 0 },
                  { label: "Nutrition Coach", price: "$40+", delay: 100 },
                  { label: "Posture Coach", price: "$40+", delay: 200 },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 transition-all duration-500 hover:border-purple-500/20 hover:bg-white/[0.04]"
                    style={{ animation: `fade-in-up 0.5s ease-out ${item.delay}ms both` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-sm text-red-400">
                        ✕
                      </span>
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
                    Save up to <span className="text-sm">$115+/month</span> compared to hiring individual coaches
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
