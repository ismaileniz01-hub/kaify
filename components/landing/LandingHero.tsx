"use client";

import { useEffect, useState } from "react";
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
  const [allowParallax, setAllowParallax] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setAllowParallax(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const bgShift = allowParallax ? parallaxSlow : 0;
  const kaiShift = allowParallax ? -parallaxFast : 0;

  return (
    <section className="landing-hero relative overflow-hidden lg:min-h-screen">
      <div
        className="absolute inset-0"
        style={{ transform: bgShift ? `translateY(${bgShift}px)` : undefined }}
      >
        <FitnessWallpaper softVignette />
      </div>

      <FloatingOrbs />
      <div className="landing-hero-glow" aria-hidden />

      <div className="landing-container relative z-10 flex flex-col items-center justify-center pb-10 pt-24 sm:pb-24 sm:pt-48 lg:min-h-[100dvh]">
        <div className="grid w-full items-center gap-6 lg:grid-cols-2 lg:gap-16">
          {/* Mobilde Kai önce gelsin — order ile sıralama */}
          <div className="relative isolate flex max-h-[34vh] items-center justify-center overflow-hidden sm:max-h-[42vh] lg:order-2 lg:max-h-none">
            <div
              className="absolute h-56 w-56 rounded-full bg-purple-500/20 blur-[100px] sm:h-72 sm:w-72"
              style={{
                transform: allowParallax
                  ? `translateY(${-parallaxFast * 0.5}px)`
                  : undefined,
              }}
              aria-hidden
            />
            <div
              className="absolute h-36 w-36 rounded-full bg-cyan-400/10 blur-[80px] sm:h-48 sm:w-48"
              style={{
                transform: allowParallax
                  ? `translate(${parallaxFast * 0.3}px, ${-parallaxFast}px)`
                  : undefined,
              }}
              aria-hidden
            />

            <ScrollReveal direction="scale" delay={200}>
              <div
                className="relative"
                style={{
                  transform: kaiShift ? `translateY(${kaiShift}px)` : undefined,
                }}
              >
                <div className="landing-kai-aura" aria-hidden />
                <div className="landing-kai-float">
                  <Image
                    src="/avatars/kai-level-2.webp"
                    alt={t("landing.hero.kai_alt")}
                    width={420}
                    height={420}
                    className="relative z-10 h-auto w-full max-w-[200px] drop-shadow-[0_24px_80px_rgba(168,85,247,0.45)] sm:max-w-[280px] lg:max-w-[420px]"
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
                {t("landing.hero.eyebrow")}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={160}>
              <h1 className="landing-hero-title">
                {t("landing.hero.title_line1")}
                <br />
                <span className="landing-gradient-text">
                  {t("landing.hero.title_accent")}
                </span>
                <br />
                {t("landing.hero.title_line3")}
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={240}>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:mt-6 sm:text-lg">
                {t("landing.hero.description")}
              </p>
            </ScrollReveal>

            <ScrollReveal delay={320} className="relative z-20 mt-6 flex w-full flex-col items-center gap-3 sm:mt-10 sm:gap-4 lg:items-start">
              <Link
                href="/pricing"
                className="landing-btn landing-btn--primary landing-btn--lg w-full max-w-sm sm:w-auto"
              >
                {t("landing.pricing.explore_plans")}
              </Link>
              <p className="text-base font-semibold tracking-[0.2em] text-purple-300/90">
                {t("landing.hero.scroll_explore")}
              </p>
            </ScrollReveal>
          </div>
        </div>

        <a
          href="#about"
          className="landing-scroll-hint mt-8 lg:absolute lg:bottom-10 lg:left-1/2 lg:mt-0 lg:-translate-x-1/2"
          aria-label={t("landing.hero.scroll_down")}
        >
          <ChevronDown className="h-6 w-6 text-purple-300/60" />
        </a>
      </div>
    </section>
  );
}
