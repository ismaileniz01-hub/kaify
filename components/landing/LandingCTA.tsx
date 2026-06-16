"use client";

import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { WaitlistForm } from "./WaitlistForm";
import { Sparkles, Zap } from "lucide-react";

export function LandingCTA() {
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
              Ready to feel in control of your progress?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-zinc-400">
              K.AIFY is launching soon. Join the waitlist and be among the first
              to get four expert coaches, smart analytics, and Kai — your dragon
              companion — in one beautifully designed app.
            </p>

            <div className="mx-auto mt-10 max-w-md">
              <WaitlistForm />
            </div>

            {/* Discount badges — highlighted */}
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

            <p className="mx-auto mt-4 max-w-sm text-center text-xs text-zinc-600">
              Free to join. Early members get priority access and launch perks.
            </p>

            {/* Güvenlik bildirimleri */}
            <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
              <p className="text-xs text-zinc-500">
                Protected by reCAPTCHA &mdash;{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition hover:text-zinc-300"
                >
                  Privacy
                </a>{" "}
                &{" "}
                <a
                  href="https://policies.google.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition hover:text-zinc-300"
                >
                  Terms
                </a>
              </p>
              <span className="hidden text-xs text-zinc-700 sm:inline" aria-hidden="true">·</span>
              <p className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.15)]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                SSL-secured connection
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
