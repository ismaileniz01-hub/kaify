import { useEffect } from "react";
import { Keyboard } from "@capacitor/keyboard";

/**
 * Same contract as web: shrink the shell by the covered viewport.
 * Never add keyboard height as extra padding on 100dvh — that is what
 * flattened the iOS OTP screen.
 */
export function useNativeKeyboardOffset() {
  useEffect(() => {
    const root = document.documentElement;

    const setOffset = (px: number) => {
      root.style.setProperty(
        "--keyboard-offset",
        `${Math.max(0, Math.round(px))}px`,
      );
    };

    const syncVisualViewport = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const covered = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setOffset(covered);
    };

    let removeShow: (() => void) | undefined;
    let removeHide: (() => void) | undefined;

    void Keyboard.addListener("keyboardWillShow", (info) => {
      if (window.visualViewport) {
        syncVisualViewport();
        return;
      }
      setOffset(Math.max(0, info.keyboardHeight));
    })
      .then((handle) => {
        removeShow = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);

    void Keyboard.addListener("keyboardWillHide", () => {
      setOffset(0);
    })
      .then((handle) => {
        removeHide = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);

    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncVisualViewport);

    return () => {
      removeShow?.();
      removeHide?.();
      window.visualViewport?.removeEventListener("resize", syncVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
      setOffset(0);
    };
  }, []);
}
