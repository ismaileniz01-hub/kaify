"use client";

import { useEffect, useState } from "react";

/** SSR-safe reduced-motion check. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Heuristic for low-end phones (memory / CPU cores). */
export function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem <= 4) return true;
  if (
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4
  ) {
    return true;
  }
  return false;
}

export type MotionBudget = {
  /** Particle trees / screen-shake / chroma keying allowed. */
  effects: boolean;
  /** 0–1 multiplier for particle counts. */
  scale: number;
  /** Canvas chroma resolution scale (0 = skip keying). */
  chromaScale: number;
};

export function getMotionBudget(): MotionBudget {
  if (prefersReducedMotion()) {
    return { effects: false, scale: 0, chromaScale: 0 };
  }
  if (isLowEndDevice()) {
    return { effects: true, scale: 0.35, chromaScale: 0.5 };
  }
  return { effects: true, scale: 1, chromaScale: 1 };
}

export function particleCount(
  desired: number,
  budget: MotionBudget = getMotionBudget(),
): number {
  if (!budget.effects || desired <= 0) return 0;
  return Math.max(0, Math.round(desired * budget.scale));
}

/** React hook — false when the tab is hidden (pause rAF work). */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return visible;
}
