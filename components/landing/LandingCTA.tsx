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
              Ready to feel in control of your health?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-zinc-400">
              K.AIFY is launching soon. Join the waitlist and be among the first
              to get four AI coaches, smart analytics, and Kai — your dragon
              companion — in one beautifully designed app.
            </p>

            <div className="mx-auto mt-10 max-w-md">
              <WaitlistForm />
            </div>

            {/* Discount badges — highlighted */}
            <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">
                  <span className="text-emerald-200">10% OFF</span> for all subscribers
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">
                  First <span className="text-amber-200">100</span> get{" "}
                  <span className="text-amber-200">lifetime 2% OFF</span>
                </span>
              </div>
            </div>

            <p className="mx-auto mt-4 max-w-sm text-center text-xs text-zinc-600">
              Free to join. Early members get priority access and launch perks.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
