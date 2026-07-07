"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useParallax } from "@/hooks/useParallax";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { ScrollReveal } from "./ScrollReveal";
import { FloatingOrbs } from "./FloatingOrbs";
import { useLang } from "@/lib/lang-context";

export function LandingHero() {
  const { t } = useLang();
  const parallaxSlow = useParallax(0.12);
  const parallaxFast = useParallax(0.28);

  return (
    <section className="landing-hero relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${parallaxSlow}px)` }}
      >
        <FitnessWallpaper softVignette />
      </div>

      <FloatingOrbs />
      <div className="landing-hero-glow" aria-hidden />

      <div className="landing-container relative z-10 flex min-h-screen flex-col items-center justify-center pb-24 pt-32 sm:pt-48">
        <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Mobilde Kai önce gelsin — order ile sıralama */}
          <div className="relative flex items-center justify-center lg:order-2">
            <div
              className="absolute h-72 w-72 rounded-full bg-purple-500/20 blur-[100px]"
              style={{ transform: `translateY(${-parallaxFast * 0.5}px)` }}
              aria-hidden
            />
            <div
              className="absolute h-48 w-48 rounded-full bg-cyan-400/10 blur-[80px]"
              style={{
                transform: `translate(${parallaxFast * 0.3}px, ${-parallaxFast}px)`,
              }}
              aria-hidden
            />

            <ScrollReveal direction="scale" delay={200}>
              <div
                className="relative"
                style={{ transform: `translateY(${-parallaxFast}px)` }}
              >
                <div className="landing-kai-aura" aria-hidden />
                <div className="landing-kai-float">
                  <Image
                    src="/kai-level-1.png"
                    alt="Kai — your dragon companion"
                    width={420}
                    height={420}
                    className="relative z-10 h-auto w-full max-w-[280px] drop-shadow-[0_24px_80px_rgba(168,85,247,0.45)] sm:max-w-[340px] lg:max-w-[420px]"
                    priority
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Metin içeriği — mobilde Kai'den sonra gelir */}
          <div className="flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
            <ScrollReveal delay={80}>
              <p className="mb-6 text-sm font-semibold uppercase tracking-[0.25em] text-purple-300/80 sm:mb-5">
                Fitness · Coaching · Made enjoyable
              </p>
            </ScrollReveal>

            <ScrollReveal delay={160}>
              <h1 className="landing-hero-title">
                Your personal
                <br />
                <span className="landing-gradient-text">Pro Coaching Team</span>
                <br />
                in one app.
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={240}>
              <p className="mt-8 max-w-lg text-lg leading-relaxed text-zinc-400 sm:mt-6">
                Stop juggling five apps and guessing your macros. K.AIFY gives you
                <strong className="text-zinc-200"> 4 expert coaches</strong>, real progress tracking,
                and <strong className="text-zinc-200">Kai</strong> — your dragon companion who keeps you
                showing up every day. Whether you're 22 or 52, getting healthier
                shouldn't feel overwhelming.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={320} className="mt-12 flex flex-col items-center gap-6 sm:mt-10 sm:gap-4 lg:items-start">
              <Link
                href="/pricing"
                className="landing-btn landing-btn--primary landing-btn--lg w-full sm:w-auto"
              >
                {t("landing.pricing.explore_plans")}
              </Link>
              <p className="text-base font-semibold tracking-[0.2em] text-purple-300/90">
                ↓ Scroll to explore
              </p>
            </ScrollReveal>
          </div>
        </div>

        <a
          href="#about"
          className="landing-scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2"
          aria-label="Scroll down"
        >
          <ChevronDown className="h-6 w-6 text-purple-300/60" />
        </a>
      </div>
    </section>
  );
}
