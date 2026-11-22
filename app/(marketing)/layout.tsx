import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { OptionalAnalytics } from "@/components/consent/OptionalAnalytics";
import "../styles/marketing.css";

/**
 * Public marketing / legal routes — statically prerendered and served from
 * cache. Do not read request headers or cookies here: that forces a server
 * render on every request. Middleware sends a nonce-less CSP for these paths.
 */
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
