"use client";

/**
 * Capacitor native push registration (FCM).
 * Listeners are wired in CapacitorShell; this module handles subscribe/unsubscribe.
 */

import { apiDelete, apiPost } from "@/lib/api/client";
import type { SubscribeResult } from "@/lib/push/client";
import {
  clearStoredNativeToken,
  getStoredNativeToken,
  setStoredNativeToken,
  waitForNativeToken,
} from "@/lib/push/native-token-store";

export { isNativePlatform } from "@/lib/native/platform";
import { isNativePlatform } from "@/lib/native/platform";

export async function getNativePermission(): Promise<
  "granted" | "denied" | "prompt" | "unsupported"
> {
  if (!(await isNativePlatform())) return "unsupported";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.checkPermissions();
    if (status.receive === "granted") return "granted";
    if (status.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

export async function subscribeToNativePush(): Promise<SubscribeResult> {
  if (!(await isNativePlatform())) return { ok: false, reason: "unsupported" };

  try {
    const { Capacitor } = await import("@capacitor/core");
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return { ok: false, reason: "denied" };

    await PushNotifications.register();

    const token = await waitForNativeToken();
    if (!token) return { ok: false, reason: "error" };

    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
    await apiPost("/api/push/native", { token, platform });
    setStoredNativeToken(token);
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function unsubscribeFromNativePush(): Promise<boolean> {
  const token = getStoredNativeToken();
  if (!token) return true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.unregister();
    await apiDelete("/api/push/native", { token }).catch(() => {});
    clearStoredNativeToken();
    return true;
  } catch {
    return false;
  }
}

export async function hasActiveNativeSubscription(): Promise<boolean> {
  if (!(await isNativePlatform())) return false;
  const perm = await getNativePermission();
  return perm === "granted" && getStoredNativeToken() !== null;
}
