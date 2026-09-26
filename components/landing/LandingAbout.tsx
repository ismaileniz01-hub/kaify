"use client";

import { BarChart3, Flame, MessageCircle, ShoppingCart } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useLang } from "@/lib/lang-context";
import { PRICING_PLANS, formatPrice } from "@/lib/marketing/pricing-plans";

const PILLARS = [
  {
    icon: BarChart3,
    key: "analytics",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.35)",
  },
  {
    icon: MessageCircle,
    key: "coaching",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.35)",
  },
  {
    icon: Flame,
    key: "streaks",
    color: "#f97316",
    glow: "rgba(249, 115, 22, 0.35)",
  },
  {
    icon: ShoppingCart,
    key: "rewards",
    color: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.35)",
  },
];

export function LandingAbout() {
  const { t } = useLang();
  const startingPrice = formatPrice(PRICING_PLANS[0].priceMonthly);

  return (
    <section id="about" className="landing-section relative">
      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400">
            {t("landing.about.eyebrow")}
          </p>
          <h2 className="landing-section-title mt-4">
            {t("landing.about.title_line1")}{" "}
            <span className="landing-gradient-text">
              {t("landing.about.title_accent")}
            </span>{" "}
            {t("landing.about.title_line3")}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            {t("landing.about.description")}
          </p>
        </ScrollReveal>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => (
            <ScrollReveal key={pillar.key} delay={i * 100} direction="up">
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
                <h3 className="mt-5 text-xl font-bold text-white">
                  {t(`landing.about.pillar.${pillar.key}.title`)}
                </h3>
                <p className="mt-1 text-sm font-medium text-purple-300/70">
                  {t(`landing.about.pillar.${pillar.key}.subtitle`)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  {t(`landing.about.pillar.${pillar.key}.description`)}
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
                  {t("landing.value.eyebrow")}
                </p>
                <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                  {t("landing.value.title")}{" "}
                  <span className="landing-gradient-text">
                    {t("landing.value.title_accent")}
                  </span>
                </h3>
              </div>

              {/* Karşılaştırma satırları */}
              <div className="space-y-3">
                {[
                  { key: "trainer", price: "$50+", icon: "🏋️" },
                  { key: "nutrition", price: "$40+", icon: "🥗" },
                  { key: "calories", price: "$10+", icon: "📊" },
                  { key: "posture", price: "$40+", icon: "🧍" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:px-5 sm:py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-sm text-red-400">
                        ✕
                      </span>
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-sm font-medium text-zinc-300">
                        {t(`landing.value.item.${item.key}`)}
                      </span>
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

              {/* Kaify Ai fiyatı — Kazanan Kartı */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-green-600/5 to-transparent p-4 sm:p-6">
                <span className="landing-value-badge">
                  {t("landing.value.best_value")}
                </span>

                <div className="relative z-10 mt-3 flex flex-col gap-3 sm:mt-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-lg text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                      ✓
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-white">Kaify Ai</p>
                      <p className="text-xs text-emerald-400/70">
                        {t("landing.value.all_in_one")}
                      </p>
                    </div>
                  </div>
                  <div className="text-start sm:text-end">
                    <p className="text-3xl font-extrabold text-white">
                      {startingPrice}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t("landing.value.starting_from")}
                    </p>
                    <p className="mt-1 max-w-[14rem] text-[11px] leading-snug text-zinc-500">
                      {t("pricing.depends_on_region")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/15 px-4 py-3 sm:flex-row sm:items-center">
                  <span className="text-sm font-bold text-emerald-400">
                    {t("landing.value.save_up_to")}{" "}
                    <span className="text-base">
                      $125+/{t("pricing.unit.month")}
                    </span>
                    <span className="hidden sm:inline">
                      {" "}
                      ·{" "}
                      <span className="text-base">
                        $1,500+/{t("pricing.unit.year")}
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] font-medium leading-snug text-emerald-400/70 sm:ms-auto">
                    {t("landing.value.comparison_note")}
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
