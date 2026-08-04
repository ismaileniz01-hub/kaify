/** Public store URLs for marketing CTAs (override via env when live). */
import { NATIVE_APP_ID } from "@/lib/app-url";

export const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() ||
  "https://apps.apple.com/app/kaify";

export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() ||
  `https://play.google.com/store/apps/details?id=${NATIVE_APP_ID}`;

export type MobileStore = "ios" | "android" | "unknown";

export function detectMobileStore(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
): MobileStore {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "unknown";
}

export function storeUrlForDevice(store: MobileStore = detectMobileStore()): string {
  if (store === "ios") return APP_STORE_URL;
  if (store === "android") return PLAY_STORE_URL;
  return PLAY_STORE_URL;
}
