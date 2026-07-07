"use client";

import { useEffect, useState } from "react";

export type NativePlatform = "ios" | "android" | "web";

export { NATIVE_APP_ID, NATIVE_URL_SCHEME } from "@/lib/app-url";

/** Capacitor native shell (not mobile Safari/Chrome). */
export async function isNativePlatform(): Promise<boolean> {
  if (typeof window === "undefined") return false;
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
    return Capacitor.getPlatform() === "ios" ? "ios" : "android";
  } catch {
    return "web";
  }
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
  const [native, setNative] = useState<boolean | null>(null);

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
