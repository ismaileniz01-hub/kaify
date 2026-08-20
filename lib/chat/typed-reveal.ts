"use client";

import { useEffect, useRef, useState } from "react";

/** Catch up in ~14 frames so long replies type fast instead of popping. */
export function typedRevealStep(shownChars: number, targetChars: number): number {
  const remaining = Math.max(0, targetChars - shownChars);
  if (remaining === 0) return 0;
  return Math.min(remaining, Math.max(3, Math.ceil(remaining / 14)));
}

function charUnits(text: string): string[] {
  return Array.from(text);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useTypedReveal(target: string, enabled: boolean): string {
  const [shown, setShown] = useState(() => (enabled ? "" : target));
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      shownRef.current = target;
      setShown(target);
      return;
    }

    let raf = 0;
    const loop = () => {
      const current = shownRef.current;
      const currentUnits = charUnits(current);
      const targetUnits = charUnits(target);
      const currentJoined = currentUnits.join("");
      let next: string;
      if (target.startsWith(currentJoined)) {
        const step = typedRevealStep(currentUnits.length, targetUnits.length);
        if (step === 0) return;
        next = targetUnits.slice(0, currentUnits.length + step).join("");
      } else {
        const step = typedRevealStep(0, targetUnits.length);
        next = targetUnits.slice(0, step).join("");
      }
      shownRef.current = next;
      setShown(next);
      if (next !== target) raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);

  return enabled ? shown : target;
}
