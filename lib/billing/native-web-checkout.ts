import { CANONICAL_APP_URL, NATIVE_URL_SCHEME } from "@/lib/app-url";
import { isNativePlatform } from "@/lib/native/platform";
import type { PlanId } from "@/lib/marketing/pricing-plans";

/** ADR 019 — Paddle Checkout only on the public website. */
export const WEB_PRICING_URL = `${CANONICAL_APP_URL}/pricing`;
/** After website signup, land on pricing and auto-open the popular plan. */
export const POST_SIGNUP_CHECKOUT_PATH = "/pricing?checkout=pro";
export const POST_SIGNUP_CHECKOUT_URL = `${CANONICAL_APP_URL}${POST_SIGNUP_CHECKOUT_PATH}`;
/** Website checkout return target for the installed app. */
export const NATIVE_CHECKOUT_RETURN_URL = `${NATIVE_URL_SCHEME}://login`;

/** Try the installed app, then continue in the website app if it did not open. */
export function openInstalledAppOrWebsite(): void {
  if (typeof window === "undefined") return;
  const started = Date.now();
  window.location.assign(NATIVE_CHECKOUT_RETURN_URL);
  window.setTimeout(() => {
    if (document.visibilityState === "visible" && Date.now() - started < 2500) {
      window.location.assign("/welcome");
    }
  }, 1200);
}

export async function shouldOpenPaddleCheckoutInApp(): Promise<boolean> {
  return !(await isNativePlatform());
}

export function parseCheckoutPlanParam(
  raw: string | null | undefined,
): PlanId | null {
  if (raw === "essential" || raw === "pro" || raw === "premium") return raw;
  if (raw === "1" || raw === "true") return "pro";
  return null;
}

/** Full navigation so httpOnly auth cookies are sent on the pricing document. */
export async function redirectToWebCheckoutAfterSignup(): Promise<void> {
  if (typeof window === "undefined") return;
  if (await isNativePlatform()) {
    const { openExternalUrl } = await import("@/lib/native/open-external");
    await openExternalUrl(POST_SIGNUP_CHECKOUT_URL);
    window.location.assign("/myaccount");
    return;
  }
  window.location.assign(POST_SIGNUP_CHECKOUT_PATH);
}
