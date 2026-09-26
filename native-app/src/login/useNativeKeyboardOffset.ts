import { useEffect } from "react";
import { Keyboard } from "@capacitor/keyboard";
import {
  bindKeyboardInset,
  type KeyboardEventSource,
} from "@/lib/native/keyboard-inset";
import { bindKeyboardReveal } from "@/lib/native/keyboard-reveal";

const loadKeyboard = async () => Keyboard as unknown as KeyboardEventSource;

/** Same keyboard inset + reveal as the Kaify WebView, bound to the static plugin import. */
export function useNativeKeyboardOffset() {
  useEffect(() => {
    const releaseInset = bindKeyboardInset(loadKeyboard);
    const releaseReveal = bindKeyboardReveal();
    return () => {
      releaseReveal();
      releaseInset();
    };
  }, []);
}
