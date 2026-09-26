"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { readNativeEntryAccessToken } from "@/lib/native/native-entry-boot";
import {
  currentNativeShellOrigin,
  looksLikeNativeWebView,
} from "@/lib/native/sign-out-native";

/** Store app must never show the marketing landing: go Home, or back to the local login shell. */
export function NativeEntryRedirect() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() && !looksLikeNativeWebView()) return;
    if (readNativeEntryAccessToken()) {
      window.location.replace("/welcome");
      return;
    }
    const shell = currentNativeShellOrigin();
    if (shell) window.location.replace(`${shell}/`);
  }, []);

  return null;
}
