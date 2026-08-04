import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { OptionalAnalytics } from "@/components/consent/OptionalAnalytics";
import { headers } from "next/headers";
import "../styles/marketing.css";

/** Public marketing / legal routes — no SessionProvider hydrate. */
export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <CookieConsentBanner />
      <OptionalAnalytics nonce={nonce} />
    </>
  );
}
