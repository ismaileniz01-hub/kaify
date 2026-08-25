import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { OptionalAnalytics } from "@/components/consent/OptionalAnalytics";
import "../styles/marketing.css";

export const dynamic = "force-static";

/** Public marketing / legal routes — no SessionProvider, no request cookies. */
export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <CookieConsentBanner />
      <OptionalAnalytics />
    </>
  );
}
