"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/session-context";
import { GemProvider } from "@/lib/gem-context";
import { KaiProvider } from "@/lib/kai-context";
import { NotificationProvider } from "@/lib/notification-context";
import { KaiSync } from "@/components/KaiSync";
import { SessionErrorBanner } from "@/components/SessionErrorBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { CapacitorShell } from "@/components/CapacitorShell";
import { NativeAppEntry } from "@/components/NativeAppEntry";
import { MfaGate } from "@/components/auth/MfaGate";
import { LegalConsentSync } from "@/components/consent/LegalConsentSync";
import { AiConsentGate } from "@/components/consent/AiConsentGate";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";
import { ReferralApplySync } from "@/components/referral/ReferralApplySync";

/** Authenticated app shell — heavy providers + gates (not used on marketing). */
export function AppShellProviders({ children }: { children: ReactNode }) {
  return (
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
            <OfflineBanner />
            {children}
          </NotificationProvider>
        </KaiProvider>
      </GemProvider>
    </SessionProvider>
  );
}
