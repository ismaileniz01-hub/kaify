"use client";

import { useEffect } from "react";

/** Keep the focused field above the native keyboard. */
export function useScrollFocusedInputIntoView(): void {
  useEffect(() => {
    const scrollTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") return;
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      scrollTarget(target);
      const onViewport = () => scrollTarget(target);
      window.visualViewport?.addEventListener("resize", onViewport);
      window.setTimeout(() => {
        window.visualViewport?.removeEventListener("resize", onViewport);
      }, 400);
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
}
