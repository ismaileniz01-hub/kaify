"use client";

import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { publicAssetUrl } from "@/lib/public-asset-url";
import { useLang } from "@/lib/lang-context";

const COACHES = [
  {
    id: "alex",
    name: "Alex",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.4)",
    avatar: "/avatars/alex.webp",
    hero: "/avatars/alex 2.webp",
  },
  {
    id: "maya",
    name: "Dr. Maya",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.4)",
    avatar: "/avatars/dr maya 1.webp",
    hero: "/avatars/dr maya 2.webp",
  },
  {
    id: "leo",
    name: "Leo",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.4)",
    avatar: "/avatars/leo.webp",
    hero: "/avatars/Leo 2.webp",
  },
  {
    id: "kai",
    name: "Kai",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.45)",
    avatar: "/avatars/kai-level-1.webp",
    hero: "/avatars/kai-level-1.webp",
  },
] as const;

export function LandingCoaches() {
  const { t } = useLang();

  return (
    <section id="coaches" className="landing-section landing-section--coaches relative overflow-hidden">
      <div className="landing-section-glow landing-section-glow--purple" aria-hidden />

      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400">
            {t("landing.coaches.eyebrow")}
          </p>
          <h2 className="landing-section-title mt-4">
            {t("landing.coaches.headline")}{" "}
            <span className="landing-gradient-text">{t("landing.coaches.headline_accent")}</span>
          </h2>
          <p className="mt-6 text-lg text-zinc-400">{t("landing.coaches.intro")}</p>
        </ScrollReveal>

        <div className="mt-12 space-y-20 sm:mt-20 sm:space-y-32">
          {COACHES.map((coach, i) => {
            const reversed = i % 2 === 1;
            const heroSrc = publicAssetUrl(coach.hero);
            const avatarSrc = publicAssetUrl(coach.avatar);
            const role = t(`landing.coaches.${coach.id}.role` as "landing.coaches.alex.role");
            return (
              <ScrollReveal
                key={coach.id}
                direction={reversed ? "right" : "left"}
                delay={80}
              >
                <article
                  className={`landing-coach-row ${reversed ? "landing-coach-row--reverse" : ""}`}
                  tabIndex={0}
                >
                  <div className="landing-coach-visual">
                    <div
                      className="landing-coach-glow"
                      style={{ background: coach.glow }}
                      aria-hidden
                    />
                    <div className="landing-coach-float" style={{ animationDelay: `${i * 0.3}s` }}>
                      <Image
                        src={heroSrc}
                        alt={coach.name}
                        width={400}
                        height={500}
                        className="landing-coach-image"
                      />
                    </div>
                  </div>

                  <div className="landing-coach-content">
                    <div
                      className="landing-coach-badge"
                      style={{
                        borderColor: coach.color,
                        boxShadow: `0 0 24px ${coach.glow}`,
                      }}
                    >
                      <Image
                        src={avatarSrc}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-bold text-white">{coach.name}</p>
                        <p className="text-sm font-medium" style={{ color: coach.color }}>
                          {role}
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-8 text-3xl font-bold text-white lg:text-4xl">
                      {t(`landing.coaches.${coach.id}.heading` as "landing.coaches.alex.heading")}
                    </h3>

                    <p className="mt-4 text-lg leading-relaxed text-zinc-400">
                      {t(`landing.coaches.${coach.id}.desc` as "landing.coaches.alex.desc")}
                    </p>

                    <div
                      className="landing-chat-preview mt-8"
                      style={{
                        borderColor: `${coach.color}55`,
                        boxShadow: `0 0 40px ${coach.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                      }}
                    >
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <Image
                          src={avatarSrc}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover ring-2"
                          style={{ boxShadow: `0 0 12px ${coach.glow}` }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">{coach.name}</p>
                          <p className="text-xs" style={{ color: coach.color }}>
                            {role}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="landing-bubble landing-bubble--coach max-w-[85%]">
                          {t(`landing.coaches.${coach.id}.quote` as "landing.coaches.alex.quote")}
                        </div>
                        <div
                          className="landing-bubble landing-bubble--user ml-auto max-w-[75%]"
                          style={{ background: coach.color }}
                        >
                          {t(`landing.coaches.${coach.id}.reply` as "landing.coaches.alex.reply")}
                        </div>
                      </div>
                    </div>
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
