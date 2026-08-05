import type { ReactNode } from "react";
import { AppShellProviders } from "@/components/providers/AppShellProviders";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { OptionalAnalytics } from "@/components/consent/OptionalAnalytics";
import { NavigationExperience } from "@/components/navigation/NavigationExperience";
import { AppChrome } from "@/components/navigation/AppChrome";
import { headers } from "next/headers";
import "../light-theme.css";
import "../styles/marketing.css";

/** Authenticated product shell (+ pricing/signup marketing styles). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <AppShellProviders>
      <NavigationExperience>
        <AppChrome>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </AppChrome>
      </NavigationExperience>
      <CookieConsentBanner />
      <OptionalAnalytics nonce={nonce} />
    </AppShellProviders>
  );
}
