"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/** Opens the bundled native app on its authenticated entry screen. */
export function NativeEntryRedirect() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      window.location.replace("/login/index.html");
    }
  }, []);

  return null;
}
