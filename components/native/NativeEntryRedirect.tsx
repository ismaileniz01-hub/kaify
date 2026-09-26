"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { readNativeEntryAccessToken } from "@/lib/native/native-entry-boot";
import { looksLikeNativeWebView } from "@/lib/native/sign-out-native";

/** Store app must never show the marketing landing: go Home, or back to the local login shell. */
export function NativeEntryRedirect() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() && !looksLikeNativeWebView()) return;
    window.location.replace(
      readNativeEntryAccessToken() ? "/welcome" : "https://localhost/",
    );
  }, []);

  return null;
}
