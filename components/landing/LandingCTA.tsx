"use client";

import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { WaitlistForm } from "./WaitlistForm";
import { Sparkles, Zap } from "lucide-react";
import { useLang } from "@/lib/lang-context";

export function LandingCTA() {
  const { t } = useLang();

  return (
    <section id="waitlist" className="landing-section relative">
      <div className="landing-container">
        <ScrollReveal direction="scale">
          <div className="landing-cta-panel">
            <div className="landing-cta-glow" aria-hidden />

            <Image
              src="/kaify-logo.png"
              alt="K.AIFY"
              width={80}
              height={80}
              className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-[0_0_48px_rgba(168,85,247,0.5)]"
            />

            <h2 className="mt-8 text-center text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              {t("landing.cta.waitlist_title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-zinc-400">
              {t("landing.cta.waitlist_subtitle")}
            </p>

            <div className="mx-auto mt-10 max-w-md">
              <WaitlistForm />
            </div>

            <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                <span className="text-xs sm:text-sm font-semibold text-emerald-300">
                  {t("landing.cta.discount_all")}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
                <span className="text-xs sm:text-sm font-semibold text-amber-300">
                  {t("landing.cta.discount_early", { count: 100 })}
                </span>
              </div>
            </div>

            <p className="mx-auto mt-4 max-w-sm text-center text-xs text-zinc-600">
              {t("landing.cta.early_note")}
            </p>

            <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
              <p className="text-xs text-zinc-500">
                {t("landing.cta.recaptcha_note")}{" "}
                <a
                  href="/privacy"
                  className="underline transition hover:text-zinc-300"
                >
                  {t("legal.privacy")}
                </a>{" "}
                &{" "}
                <a
                  href="/terms&conditions"
                  className="underline transition hover:text-zinc-300"
                >
                  {t("legal.terms")}
                </a>
              </p>
              <span className="hidden text-xs text-zinc-700 sm:inline" aria-hidden="true">
                ·
              </span>
              <p className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.15)]">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {t("landing.cta.ssl")}
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
