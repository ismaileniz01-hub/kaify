"use client";

import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";

const COACHES = [
  {
    id: "alex",
    name: "Alex",
    role: "Fitness Coach",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.4)",
    avatar: "/avatars/alex.png",
    hero: "/avatars/alex 2.png",
    quote: "Great session today! Keep the momentum 💪",
    desc: "Stop wondering if you're training right. Alex builds your workouts, tracks your sets, and pushes you on the days you'd rather skip — like a real trainer in your pocket.",
    heading: "Train smarter with Alex",
    reply: "Leg day was tough but I finished!",
  },
  {
    id: "maya",
    name: "Dr. Maya",
    role: "Nutritionist",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.4)",
    avatar: "/avatars/dr maya 1.png",
    hero: "/avatars/dr maya 2.png",
    quote: "Your meal plan is ready 🥗",
    desc: "Nutrition is where most people fail — not the gym. Dr. Maya creates meal plans tailored to your goals, adjusts macros on training days, and answers the 'what should I eat?' question instantly.",
    heading: "Eat right with Dr. Maya",
    reply: "Perfect — any changes for lunch?",
  },
  {
    id: "leo",
    name: "Leo",
    role: "Body Analyst",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.4)",
    avatar: "/avatars/leo.png",
    hero: "/avatars/Leo 2.png",
    quote: "Your posture scan results are in 📋",
    desc: "You can't fix what you can't see. Leo analyzes your posture, scores your form, and gives you specific mobility work — so you train safely whether you're 25 or 55.",
    heading: "Move better with Leo",
    reply: "How did I score overall?",
  },
  {
    id: "kai",
    name: "Kai",
    role: "Dragon Companion",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.45)",
    avatar: "/kai-level-1.png",
    hero: "/kai-level-1.png",
    quote: "Hey! How are you feeling today?",
    desc: "Fitness is emotional as much as physical. Kai is your dragon companion — always there to chat, celebrate wins, and remind you why you started. The friend who never judges, only encourages.",
    heading: "Never go alone with Kai",
    reply: "Doing okay — let's keep going!",
  },
];

export function LandingCoaches() {
  return (
    <section id="coaches" className="landing-section landing-section--coaches relative overflow-hidden">
      <div className="landing-section-glow landing-section-glow--purple" aria-hidden />

      <div className="landing-container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-400">
            Pro Coaching Team
          </p>
          <h2 className="landing-section-title mt-4">
            Four experts.{" "}
            <span className="landing-gradient-text">One conversation away.</span>
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            Hiring a trainer, nutritionist, and posture coach costs hundreds per
            month. K.AIFY puts all four in your pocket — available 24/7, personalized
            to you, at a fraction of the cost.
          </p>
        </ScrollReveal>

        <div className="mt-12 space-y-20 sm:mt-20 sm:space-y-32">
          {COACHES.map((coach, i) => {
            const reversed = i % 2 === 1;
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
                        src={coach.hero}
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
                        src={coach.avatar}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-bold text-white">{coach.name}</p>
                        <p
                          className="text-sm font-medium"
                          style={{ color: coach.color }}
                        >
                          {coach.role}
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-8 text-3xl font-bold text-white lg:text-4xl">
                      {coach.heading}
                    </h3>

                    <p className="mt-4 text-lg leading-relaxed text-zinc-400">
                      {coach.desc}
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
                          src={coach.avatar}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover ring-2"
                          style={{ boxShadow: `0 0 12px ${coach.glow}` }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">{coach.name}</p>
                          <p className="text-xs" style={{ color: coach.color }}>
                            {coach.role}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="landing-bubble landing-bubble--coach max-w-[85%]">
                          {coach.quote}
                        </div>
                        <div
                          className="landing-bubble landing-bubble--user ml-auto max-w-[75%]"
                          style={{ background: coach.color }}
                        >
                          {coach.reply}
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
