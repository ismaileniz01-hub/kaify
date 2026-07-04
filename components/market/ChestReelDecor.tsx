"use client";

import { Dumbbell, Flame, Gem, Sparkles, Star, Zap } from "lucide-react";

/** Decorative layer behind the reward reel — purple / gold / cyan Kaify palette. */
export function ChestReelDecor() {
  return (
    <div className="chest-reel-decor pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <div className="chest-reel-orb chest-reel-orb--purple" aria-hidden />
      <div className="chest-reel-orb chest-reel-orb--amber" aria-hidden />
      <div className="chest-reel-orb chest-reel-orb--cyan" aria-hidden />

      <div className="chest-reel-spark chest-reel-spark--1" aria-hidden />
      <div className="chest-reel-spark chest-reel-spark--2" aria-hidden />
      <div className="chest-reel-spark chest-reel-spark--3" aria-hidden />
      <div className="chest-reel-spark chest-reel-spark--4" aria-hidden />
      <div className="chest-reel-spark chest-reel-spark--5" aria-hidden />

      <div className="chest-reel-corner chest-reel-corner--tl" aria-hidden />
      <div className="chest-reel-corner chest-reel-corner--tr" aria-hidden />
      <div className="chest-reel-corner chest-reel-corner--bl" aria-hidden />
      <div className="chest-reel-corner chest-reel-corner--br" aria-hidden />

      <div className="chest-reel-rarity-bar" aria-hidden>
        <span className="chest-reel-rarity-dot chest-reel-rarity-dot--common" />
        <span className="chest-reel-rarity-dot chest-reel-rarity-dot--rare" />
        <span className="chest-reel-rarity-dot chest-reel-rarity-dot--ultra" />
        <span className="chest-reel-rarity-dot chest-reel-rarity-dot--epic" />
        <span className="chest-reel-rarity-dot chest-reel-rarity-dot--legend" />
      </div>

      <Sparkles className="chest-reel-icon chest-reel-icon--spark-a" strokeWidth={1.5} />
      <Sparkles className="chest-reel-icon chest-reel-icon--spark-b" strokeWidth={1.5} />
      <Star className="chest-reel-icon chest-reel-icon--star-a" strokeWidth={1.5} />
      <Star className="chest-reel-icon chest-reel-icon--star-b" strokeWidth={1.5} />
      <Gem className="chest-reel-icon chest-reel-icon--gem-a" strokeWidth={1.5} />
      <Gem className="chest-reel-icon chest-reel-icon--gem-b" strokeWidth={1.5} />
      <Flame className="chest-reel-icon chest-reel-icon--flame" strokeWidth={1.5} />
      <Dumbbell className="chest-reel-icon chest-reel-icon--dumbbell" strokeWidth={1.5} />
      <Zap className="chest-reel-icon chest-reel-icon--zap" strokeWidth={1.5} />
    </div>
  );
}
