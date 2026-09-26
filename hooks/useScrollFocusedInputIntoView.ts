"use client";

import { useEffect } from "react";
import { bindKeyboardInset } from "@/lib/native/keyboard-inset";
import { bindKeyboardReveal } from "@/lib/native/keyboard-reveal";

/** Keep the focused field (and its data-keyboard-cta) above the keyboard. */
export function useScrollFocusedInputIntoView(): void {
  useEffect(() => {
    const releaseInset = bindKeyboardInset();
    const releaseReveal = bindKeyboardReveal();
    return () => {
      releaseReveal();
      releaseInset();
    };
  }, []);
}
