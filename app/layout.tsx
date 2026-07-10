import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./light-theme.css";

import { SessionProvider } from "@/lib/session-context";
import { GemProvider } from "@/lib/gem-context";
import { KaiProvider } from "@/lib/kai-context";
import { NotificationProvider } from "@/lib/notification-context";
import { KaiSync } from "@/components/KaiSync";
import { SessionErrorBanner } from "@/components/SessionErrorBanner";
import { CapacitorShell } from "@/components/CapacitorShell";
import { NativeAppEntry } from "@/components/NativeAppEntry";
import { MfaGate } from "@/components/auth/MfaGate";
import { LegalConsentSync } from "@/components/consent/LegalConsentSync";
import { AiConsentGate } from "@/components/consent/AiConsentGate";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { OptionalAnalytics } from "@/components/consent/OptionalAnalytics";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";
import { ReferralApplySync } from "@/components/referral/ReferralApplySync";
import { ThemeProvider } from "@/lib/theme-context";
import { LangProvider } from "@/lib/lang-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "K.AIFY — Your Personal Coach Team",
  description:
    "Four expert coaches, smart analytics, and Kai your dragon companion. Plans from $14.99/month.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "K.AIFY",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ viewTransitionName: "root" }}
      >
        <ThemeProvider>
          <LangProvider>
            <SessionProvider>
              <GemProvider>
                <KaiProvider>
                  <NotificationProvider>
                    <CapacitorShell />
                    <NativeAppEntry />
                    <MfaGate />
                    <LegalConsentSync />
                    <ReferralApplySync />
                    <AiConsentGate />
                    <OnboardingGate />
                    <SubscriptionGate />
                    <KaiSync />
                    <SessionErrorBanner />
                    {children}
                    <CookieConsentBanner />
                    <OptionalAnalytics nonce={nonce} />
                  </NotificationProvider>
                </KaiProvider>
              </GemProvider>
            </SessionProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
