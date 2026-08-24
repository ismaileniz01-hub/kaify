"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { isOnboardingExemptPath } from "@/lib/onboarding/exempt-path";
import { useLang } from "@/lib/lang-context";
import { MotionDialog } from "@/components/ui/MotionDialog";

const OnboardingProfileForm = dynamic(
  () =>
    import("@/components/onboarding/OnboardingProfileForm").then((m) => ({
      default: m.OnboardingProfileForm,
    })),
  { ssr: false },
);

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

  const open =
    !isOnboardingExemptPath(pathname ?? "") &&
    needsOnboarding;

  return (
    <MotionDialog
      open={open}
      labelledBy="onboarding-title"
      closeOnBackdrop={false}
      className="z-[100] bg-black/80"
      panelClassName="relative mx-4 max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl"
    >
      <div>
        <div className="border-b border-white/5 px-6 py-5">
          <h2 id="onboarding-title" className="text-lg font-bold text-white">{t("onboarding.title")}</h2>
          <p className="mt-1 text-xs text-zinc-400">{t("onboarding.subtitle")}</p>
        </div>
        <div className="px-6 py-6">
          <OnboardingProfileForm
            initialDisplayName={profile?.displayName ?? ""}
            onSuccess={refreshSession}
          />
        </div>
      </div>
    </MotionDialog>
  );
}
