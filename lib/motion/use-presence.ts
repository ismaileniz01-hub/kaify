"use client";

import { useEffect, useState } from "react";

export const MOTION_EXIT_MS = 220;

export type PresenceState = "entering" | "entered" | "exiting";

/**
 * Keeps an overlay mounted long enough to play its exit transition.
 * Motion is CSS-only and collapses to zero duration under reduced motion.
 */
export function usePresence(open: boolean, exitMs = MOTION_EXIT_MS) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<PresenceState>(
    open ? "entered" : "exiting",
  );

  useEffect(() => {
    if (open) {
      setMounted(true);
      setState("entering");
      const frame = requestAnimationFrame(() => setState("entered"));
      return () => cancelAnimationFrame(frame);
    }

    if (!mounted) return;
    setState("exiting");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => setMounted(false),
      reduceMotion ? 0 : exitMs,
    );
    return () => window.clearTimeout(timer);
  }, [open, mounted, exitMs]);

  return { mounted, state };
}
