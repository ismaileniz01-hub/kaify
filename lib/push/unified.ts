"use client";

/**
 * Unified push API — Web Push in browser, native FCM in Capacitor shell.
 */

import type { SubscribeResult } from "@/lib/push/client";
import * as web from "@/lib/push/client";
import * as native from "@/lib/push/native-client";

export async function isPushAvailable(): Promise<boolean> {
  if (await native.isNativePlatform()) return true;
  return web.isPushSupported();
}

export async function getPushPermission(): Promise<
  NotificationPermission | "unsupported" | "prompt"
> {
  if (await native.isNativePlatform()) {
    const p = await native.getNativePermission();
    if (p === "unsupported") return "unsupported";
    if (p === "granted") return "granted";
    if (p === "denied") return "denied";
    return "default";
  }
  return web.getPermission();
}

export async function subscribeToPush(): Promise<SubscribeResult> {
  if (await native.isNativePlatform()) return native.subscribeToNativePush();
  return web.subscribeToPush();
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (await native.isNativePlatform()) return native.unsubscribeFromNativePush();
  return web.unsubscribeFromPush();
}

export async function hasActiveSubscription(): Promise<boolean> {
  if (await native.isNativePlatform()) return native.hasActiveNativeSubscription();
  return web.hasActiveSubscription();
}

export async function ensurePushReady(): Promise<void> {
  if (await native.isNativePlatform()) return;
  await web.ensureServiceWorker();
}
