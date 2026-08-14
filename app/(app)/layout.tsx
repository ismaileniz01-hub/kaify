import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AppShellProviders } from "@/components/providers/AppShellProviders";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { OptionalAnalytics } from "@/components/consent/OptionalAnalytics";
import { NavigationExperience } from "@/components/navigation/NavigationExperience";
import { AppChrome } from "@/components/navigation/AppChrome";
import { headers } from "next/headers";
import "../light-theme.css";
import "../styles/marketing.css";

/** Default: product chrome is not indexed. Pricing overrides to INDEX. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Authenticated product shell (+ pricing/signup marketing styles). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}
