import { CANONICAL_APP_URL, NATIVE_URL_SCHEME } from "@/lib/app-url";
import { isNativePlatform } from "@/lib/native/platform";

/** ADR 019 — Paddle Checkout only on the public website. */
export const WEB_PRICING_URL = `${CANONICAL_APP_URL}/pricing`;
/** Website checkout return target for the installed app. */
export const NATIVE_CHECKOUT_RETURN_URL = `${NATIVE_URL_SCHEME}://login`;

export async function shouldOpenPaddleCheckoutInApp(): Promise<boolean> {
  return !(await isNativePlatform());
}
