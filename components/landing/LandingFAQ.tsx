"use client";

import { useId, useState } from "react";
import {
  Camera,
  ChevronDown,
  Flame,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useLang } from "@/lib/lang-context";

const FAQ_ITEMS = [
  {
    qKey: "landing.faq.q1",
    aKey: "landing.faq.a1",
    accent: "purple",
    Icon: Sparkles,
  },
  {
    qKey: "landing.faq.q2",
    aKey: "landing.faq.a2",
    accent: "cyan",
    Icon: UserRound,
  },
  {
    qKey: "landing.faq.q3",
    aKey: "landing.faq.a3",
    accent: "green",
    Icon: Camera,
  },
  {
    qKey: "landing.faq.q4",
    aKey: "landing.faq.a4",
    accent: "blue",
    Icon: Users,
  },
  {
    qKey: "landing.faq.q5",
    aKey: "landing.faq.a5",
    accent: "orange",
    Icon: Flame,
  },
] as const;

type LandingFAQProps = {
  nonce?: string;
};

export function LandingFAQ({ nonce }: LandingFAQProps) {
  const { t } = useLang();
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState(0);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: t(item.qKey),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(item.aKey),
      },
    })),
  };

  return (
    <section id="faq" className="landing-section landing-section--faq relative overflow-hidden">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="landing-section-glow landing-section-glow--faq" aria-hidden />

      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300/90">
            {t("landing.faq.eyebrow")}
          </p>
          <h2 className="landing-section-title mt-4">
            {t("landing.faq.headline")}{" "}
            <span className="landing-gradient-text">{t("landing.faq.headline_accent")}</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            {t("landing.faq.description")}
          </p>
        </ScrollReveal>

        <div className="landing-faq-list mx-auto mt-10 max-w-3xl sm:mt-14">
          {FAQ_ITEMS.map((item, i) => {
            const open = openIndex === i;
            const panelId = `${baseId}-panel-${i}`;
            const buttonId = `${baseId}-button-${i}`;
            const n = String(i + 1).padStart(2, "0");

            return (
              <ScrollReveal key={item.qKey} delay={i * 80} direction="up">
                <article
                  className={`landing-faq-item landing-faq-item--${item.accent} ${
                    open ? "landing-faq-item--open" : ""
                  }`}
                >
                  <h3 className="landing-faq-heading">
                    <button
                      type="button"
                      id={buttonId}
                      className="landing-faq-trigger"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(open ? -1 : i)}
                    >
                      <span className="landing-faq-index" aria-hidden>
                        {n}
                      </span>
                      <span className="landing-faq-icon" aria-hidden>
                        <item.Icon className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <span className="landing-faq-question">{t(item.qKey)}</span>
                      <ChevronDown className="landing-faq-chevron" aria-hidden />
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="landing-faq-answer"
                    inert={!open}
                  >
                    <p className="landing-faq-answer-inner">{t(item.aKey)}</p>
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
