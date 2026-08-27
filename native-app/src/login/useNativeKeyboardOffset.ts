import { useEffect } from "react";
import { Keyboard } from "@capacitor/keyboard";

/**
 * Mirrors web --keyboard-offset behavior under Capacitor KeyboardResize.None.
 */
export function useNativeKeyboardOffset() {
  useEffect(() => {
    const root = document.documentElement;
    let removeShow: (() => void) | undefined;
    let removeHide: (() => void) | undefined;

    void Keyboard.addListener("keyboardWillShow", (info) => {
      root.style.setProperty(
        "--keyboard-offset",
        `${Math.max(0, info.keyboardHeight)}px`,
      );
    })
      .then((handle) => {
        removeShow = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);

    void Keyboard.addListener("keyboardWillHide", () => {
      root.style.setProperty("--keyboard-offset", "0px");
    })
      .then((handle) => {
        removeHide = () => {
          void handle.remove();
        };
      })
      .catch(() => undefined);

    return () => {
      removeShow?.();
      removeHide?.();
      root.style.setProperty("--keyboard-offset", "0px");
    };
  }, []);
}
