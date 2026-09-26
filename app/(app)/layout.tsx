import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AppShellProviders } from "@/components/providers/AppShellProviders";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { NavigationExperience } from "@/components/navigation/NavigationExperience";
import { AppChrome } from "@/components/navigation/AppChrome";
import "../light-theme.css";
import "../styles/marketing.css";

/** Default: product chrome is not indexed. Pricing overrides to INDEX. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Middleware sends a per-request CSP nonce with 'strict-dynamic'. Prerendered
 * HTML has no nonce on Next's scripts, so the browser blocks them all and the
 * page never hydrates (frozen "Welcome, …" / skeletons). Render per request.
 */
export const dynamic = "force-dynamic";

/** Authenticated product shell (+ pricing/signup marketing styles). */
export default function AppLayout({ children }: { children: ReactNode }) {
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
      </AppShellProviders>
    </ToastProvider>
  );
}
