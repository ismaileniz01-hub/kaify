"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { OnboardingProfileForm } from "@/components/onboarding/OnboardingProfileForm";
import { useSession } from "@/lib/session-context";
import { useLang } from "@/lib/lang-context";

/**
 * Blocks the app when profile forms are incomplete — except on /signup where
 * the website signup flow collects the same fields inline.
 */
export function OnboardingGate() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, profile, refreshSession } = useSession();
  const { t } = useLang();

  const needsOnboarding =
    isAuthenticated && !isLoading && profile?.onboardingStatus === "PAID";

  if (pathname.startsWith("/signup") || !needsOnboarding) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="border-b border-white/5 px-6 py-5">
          <h2 className="text-lg font-bold text-white">{t("onboarding.title")}</h2>
          <p className="mt-1 text-xs text-zinc-400">{t("onboarding.subtitle")}</p>
        </div>
        <div className="px-6 py-6">
          <OnboardingProfileForm
            initialDisplayName={profile?.displayName ?? ""}
            onSuccess={refreshSession}
          />
        </div>
      </div>
    </div>
  );
}
