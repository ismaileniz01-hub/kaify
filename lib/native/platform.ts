"use client";

import { useEffect, useState } from "react";

export type NativePlatform = "ios" | "android" | "web";

export { NATIVE_APP_ID, NATIVE_URL_SCHEME } from "@/lib/app-url";

/**
 * Installed app, including kaifyai.org inside the WebView.
 * Capacitor.isNativePlatform() is often false until the bridge finishes loading.
 */
export function installedAppHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (/KaifyNative/i.test(navigator.userAgent)) return true;
    if (document.documentElement.classList.contains("native-app")) return true;
    const cap = (
      window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor;
    return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
  } catch {
    return false;
  }
}

/** Capacitor native shell (not mobile Safari/Chrome). */
export async function isNativePlatform(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (installedAppHint()) return true;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function getNativePlatform(): Promise<NativePlatform> {
  if (!(await isNativePlatform())) return "web";
  try {
    const { Capacitor } = await import("@capacitor/core");
    const platform = Capacitor.getPlatform();
    if (platform === "ios") return "ios";
    if (platform === "android") return "android";
  } catch {
    // The user agent still identifies the shell.
  }
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
    return "android";
  }
  return "ios";
}

/** Marks `<html>` for native-only CSS (safe areas, keyboard). Called from CapacitorShell. */
export function markNativeAppRoot(platform: NativePlatform): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("native-app");
  document.documentElement.dataset.platform = platform;
}

export function clearNativeAppRoot(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("native-app");
  delete document.documentElement.dataset.platform;
}

/**
 * `null` while detecting (avoid cookie-banner flash), then `true`/`false`.
 */
export function useNativeApp(): boolean | null {
  const [native, setNative] = useState<boolean | null>(() =>
    typeof window === "undefined" ? null : installedAppHint() ? true : null,
  );

  useEffect(() => {
    let cancelled = false;
    void isNativePlatform().then((value) => {
      if (!cancelled) setNative(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return native;
}
