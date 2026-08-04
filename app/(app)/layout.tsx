import type { ReactNode } from "react";
import { AppShellProviders } from "@/components/providers/AppShellProviders";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { OptionalAnalytics } from "@/components/consent/OptionalAnalytics";
import { headers } from "next/headers";
import "../light-theme.css";
import "../styles/marketing.css";

/** Authenticated product shell (+ pricing/signup marketing styles). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <AppShellProviders>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <CookieConsentBanner />
      <OptionalAnalytics nonce={nonce} />
    </AppShellProviders>
  );
}
