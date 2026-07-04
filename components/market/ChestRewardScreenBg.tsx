"use client";

import { Dumbbell, Flame, Gem, Sparkles, Star, Trophy, Zap } from "lucide-react";

/** Full-screen atmospheric backdrop for the chest reward phase. */
export function ChestRewardScreenBg() {
  return (
    <div className="chest-reward-screen pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="chest-reward-screen__gradient" />
      <div className="chest-reward-screen__grid" />

      <div className="chest-reward-screen__orb chest-reward-screen__orb--1" />
      <div className="chest-reward-screen__orb chest-reward-screen__orb--2" />
      <div className="chest-reward-screen__orb chest-reward-screen__orb--3" />
      <div className="chest-reward-screen__orb chest-reward-screen__orb--4" />
      <div className="chest-reward-screen__orb chest-reward-screen__orb--5" />

      <div className="chest-reward-screen__ray chest-reward-screen__ray--1" />
      <div className="chest-reward-screen__ray chest-reward-screen__ray--2" />
      <div className="chest-reward-screen__ray chest-reward-screen__ray--3" />

      {[
        { cls: "chest-reward-screen__dot chest-reward-screen__dot--1", color: "#a1a1aa" },
        { cls: "chest-reward-screen__dot chest-reward-screen__dot--2", color: "#38bdf8" },
        { cls: "chest-reward-screen__dot chest-reward-screen__dot--3", color: "#d946ef" },
        { cls: "chest-reward-screen__dot chest-reward-screen__dot--4", color: "#fbbf24" },
        { cls: "chest-reward-screen__dot chest-reward-screen__dot--5", color: "#22d3ee" },
        { cls: "chest-reward-screen__dot chest-reward-screen__dot--6", color: "#a78bfa" },
      ].map(({ cls, color }) => (
        <span key={cls} className={cls} style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      ))}

      <Sparkles className="chest-reward-screen__icon chest-reward-screen__icon--s1" strokeWidth={1.5} />
      <Sparkles className="chest-reward-screen__icon chest-reward-screen__icon--s2" strokeWidth={1.5} />
      <Sparkles className="chest-reward-screen__icon chest-reward-screen__icon--s3" strokeWidth={1.5} />
      <Star className="chest-reward-screen__icon chest-reward-screen__icon--st1" strokeWidth={1.5} />
      <Star className="chest-reward-screen__icon chest-reward-screen__icon--st2" strokeWidth={1.5} />
      <Gem className="chest-reward-screen__icon chest-reward-screen__icon--g1" strokeWidth={1.5} />
      <Gem className="chest-reward-screen__icon chest-reward-screen__icon--g2" strokeWidth={1.5} />
      <Gem className="chest-reward-screen__icon chest-reward-screen__icon--g3" strokeWidth={1.5} />
      <Flame className="chest-reward-screen__icon chest-reward-screen__icon--f1" strokeWidth={1.5} />
      <Flame className="chest-reward-screen__icon chest-reward-screen__icon--f2" strokeWidth={1.5} />
      <Dumbbell className="chest-reward-screen__icon chest-reward-screen__icon--d1" strokeWidth={1.5} />
      <Dumbbell className="chest-reward-screen__icon chest-reward-screen__icon--d2" strokeWidth={1.5} />
      <Zap className="chest-reward-screen__icon chest-reward-screen__icon--z1" strokeWidth={1.5} />
      <Trophy className="chest-reward-screen__icon chest-reward-screen__icon--t1" strokeWidth={1.5} />
    </div>
  );
}
