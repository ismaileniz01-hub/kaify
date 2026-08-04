import { CANONICAL_APP_URL } from "@/lib/app-url";
import { isNativePlatform } from "@/lib/native/platform";
import { openExternalUrl } from "@/lib/native/open-external";

/** ADR 019 — Paddle Checkout only on web; native uses the system browser. */
export const WEB_PRICING_URL = `${CANONICAL_APP_URL}/pricing`;

export async function shouldOpenPaddleCheckoutInApp(): Promise<boolean> {
  return !(await isNativePlatform());
}

/** Open website pricing (or a portal URL) outside the Capacitor WebView. */
export async function openWebBillingUrl(url: string = WEB_PRICING_URL): Promise<void> {
  await openExternalUrl(url);
}
