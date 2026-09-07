import { useEffect } from "react";
import { Keyboard } from "@capacitor/keyboard";
import {
  applyKeyboardOffset,
  coveredByKeyboard,
} from "@/lib/native/keyboard-covered";

/**
 * Shrink the shell by the covered viewport.
 * iOS WKWebView exposes visualViewport but innerHeight often tracks it, so
 * covered ≈ 0 unless we also take Capacitor's keyboardHeight.
 */
export function useNativeKeyboardOffset() {
  useEffect(() => {
    let pluginHeight = 0;

    const sync = (nextPlugin?: number) => {
      if (typeof nextPlugin === "number") pluginHeight = nextPlugin;
      applyKeyboardOffset(coveredByKeyboard(pluginHeight));
    };

    let removeShow: (() => void) | undefined;
    let removeDidShow: (() => void) | undefined;
    let removeHide: (() => void) | undefined;

    void Keyboard.addListener("keyboardWillShow", (info) => {
      sync(Math.max(0, info.keyboardHeight));
    })
      .then((handle) => {
        removeShow = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);

    void Keyboard.addListener("keyboardDidShow", (info) => {
      sync(Math.max(0, info.keyboardHeight));
    })
      .then((handle) => {
        removeDidShow = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);

    void Keyboard.addListener("keyboardWillHide", () => {
      pluginHeight = 0;
      applyKeyboardOffset(0);
    })
      .then((handle) => {
        removeHide = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);

    const onViewport = () => sync();
    window.visualViewport?.addEventListener("resize", onViewport);
    window.visualViewport?.addEventListener("scroll", onViewport);

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
