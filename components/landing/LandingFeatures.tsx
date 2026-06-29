"use client";

import { ScrollReveal } from "./ScrollReveal";
import { AnimatedStatGrid } from "./AnimatedStatGrid";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import { MacroRing } from "@/components/analytics/MacroRing";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useLang } from "@/lib/lang-context";

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
  const { t } = useLang();
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

      </div>
    </section>
  );
}
