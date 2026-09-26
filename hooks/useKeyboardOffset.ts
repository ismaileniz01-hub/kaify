"use client";

import { useEffect } from "react";
import { bindKeyboardInset } from "@/lib/native/keyboard-inset";

/** Keep --keyboard-offset in sync on web login / signup (and native WebView). */
export function useKeyboardOffset(): void {
  useEffect(() => bindKeyboardInset(), []);
}
