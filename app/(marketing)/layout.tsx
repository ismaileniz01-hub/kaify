import type { ReactNode } from "react";
import { headers } from "next/headers";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { OptionalAnalytics } from "@/components/consent/OptionalAnalytics";
import "../styles/marketing.css";

/** Public marketing / legal routes — nonce from middleware so script-src needs no unsafe-inline. */
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
