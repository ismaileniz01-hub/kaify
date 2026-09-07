"use client";

import { useEffect } from "react";
import {
  applyKeyboardOffset,
  coveredByKeyboard,
} from "@/lib/native/keyboard-covered";

/** Keep --keyboard-offset in sync on web login / signup (and native WebView). */
export function useKeyboardOffset(): void {
  useEffect(() => {
    let pluginHeight = 0;
    const sync = (nextPlugin?: number) => {
      if (typeof nextPlugin === "number") pluginHeight = nextPlugin;
      applyKeyboardOffset(coveredByKeyboard(pluginHeight));
    };

    const onViewport = () => sync();
    window.visualViewport?.addEventListener("resize", onViewport);
    window.visualViewport?.addEventListener("scroll", onViewport);

    let removeShow: (() => void) | undefined;
    let removeDidShow: (() => void) | undefined;
    let removeHide: (() => void) | undefined;

    void import("@capacitor/keyboard")
      .then(async ({ Keyboard }) => {
        const show = await Keyboard.addListener("keyboardWillShow", (info) => {
          sync(Math.max(0, info.keyboardHeight));
        });
        removeShow = () => {
          void show.remove();
        };
        const didShow = await Keyboard.addListener("keyboardDidShow", (info) => {
          sync(Math.max(0, info.keyboardHeight));
        });
        removeDidShow = () => {
          void didShow.remove();
        };
        const hide = await Keyboard.addListener("keyboardWillHide", () => {
          pluginHeight = 0;
          applyKeyboardOffset(0);
        });
        removeHide = () => {
          void hide.remove();
        };
      })
      .catch(() => undefined);

    return () => {
      removeShow?.();
      removeDidShow?.();
      removeHide?.();
      window.visualViewport?.removeEventListener("resize", onViewport);
      window.visualViewport?.removeEventListener("scroll", onViewport);
      applyKeyboardOffset(0);
    };
  }, []);
}
