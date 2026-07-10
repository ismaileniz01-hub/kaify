"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check, Mail } from "lucide-react";
import { SignupVerifyStep } from "@/components/auth/SignupVerifyStep";
import { LegalConsentCheckbox } from "@/components/auth/AuthModeToggle";
import { OnboardingProfileForm } from "@/components/onboarding/OnboardingProfileForm";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { FloatingOrbs } from "@/components/landing/FloatingOrbs";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { sendEmailLoginCode } from "@/lib/auth/email-otp";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-redirect";
import {
  PENDING_LEGAL_CONSENT_KEY,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import type { OnboardingInput } from "@/lib/validations/onboarding.schema";
import type { ProfileDTO } from "@/lib/types/domain.types";

type SignupStep = "profile" | "verify";

type Props = {
  redirectTo?: string;
};

function storePendingLegalConsent(): void {
  localStorage.setItem(
    PENDING_LEGAL_CONSENT_KEY,
    JSON.stringify({
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      acceptedAt: new Date().toISOString(),
    }),
  );
}

export function WebsiteSignupFlow({ redirectTo = "/welcome" }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const { isAuthenticated, isLoading, profile, refreshSession } = useSession();
  const safeRedirect = sanitizeAuthRedirect(redirectTo);

  const [step, setStep] = useState<SignupStep>("profile");
  const [email, setEmail] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pendingProfile, setPendingProfile] = useState<OnboardingInput | null>(null);
  const [sendingCode, setSendingCode] = useState(false);

  const alreadyAuthedNeedsProfile =
    isAuthenticated && !isLoading && profile?.onboardingStatus === "PAID";

  useEffect(() => {
    if (isLoading) return;
    if (alreadyAuthedNeedsProfile) {
      setStep("profile");
      return;
    }
    if (isAuthenticated && profile && profile.onboardingStatus !== "PAID") {
      router.replace(safeRedirect);
    }
  }, [
    alreadyAuthedNeedsProfile,
    isAuthenticated,
    isLoading,
    profile,
    router,
    safeRedirect,
  ]);

  const completeOnboarding = useCallback(
    async (data: OnboardingInput) => {
      await apiPost<ProfileDTO>("/api/onboarding", data);
      await refreshSession();
      router.replace(safeRedirect);
    },
    [refreshSession, router, safeRedirect],
  );

  const handleProfileSuccess = useCallback(async () => {
    await refreshSession();
    router.replace(safeRedirect);
  }, [refreshSession, router, safeRedirect]);

  const handleProfileData = useCallback(
    async (data: OnboardingInput) => {
      if (alreadyAuthedNeedsProfile) {
        await completeOnboarding(data);
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        setProfileError(t("signup.error.email_required"));
        return;
      }
      if (!legalAccepted) {
        setProfileError(t("login.error.legal_required"));
        return;
      }

      setSendingCode(true);
      setProfileError(null);
      try {
        storePendingLegalConsent();
        const result = await sendEmailLoginCode(trimmedEmail);
        if (!result.ok) {
          setProfileError(result.message);
          return;
        }
        setPendingProfile(data);
        setStep("verify");
      } finally {
        setSendingCode(false);
      }
    },
    [alreadyAuthedNeedsProfile, completeOnboarding, email, legalAccepted, t],
  );

  const handleVerified = useCallback(async () => {
    if (!pendingProfile) return;
    await refreshSession();
    await completeOnboarding(pendingProfile);
  }, [completeOnboarding, pendingProfile, refreshSession]);

  const stepIndex = step === "profile" ? 0 : 1;

  return (
    <section className="signup-hero relative overflow-hidden pb-20 pt-28 sm:pt-32">
      <div className="absolute inset-0">
        <FitnessWallpaper softVignette />
      </div>
      <FloatingOrbs />
      <div className="landing-hero-glow" aria-hidden />

      <div className="landing-container relative z-10">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-purple-300/80">
              {t("signup.page.eyebrow")}
            </p>
            <h1 className="landing-hero-title text-4xl sm:text-5xl">
              {t("signup.page.title")}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-zinc-400">
              {t("signup.page.subtitle")}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={120} className="mt-10">
          <ol className="signup-steps" aria-label={t("signup.steps.label")}>
            <li
              className={`signup-steps__item ${
                stepIndex >= 0 ? "signup-steps__item--active" : ""
              } ${stepIndex > 0 ? "signup-steps__item--done" : ""}`}
            >
              <span className="signup-steps__dot">
                {stepIndex > 0 ? <Check className="h-3.5 w-3.5" /> : "1"}
              </span>
              <span>{t("signup.steps.profile")}</span>
            </li>
            <li
              className={`signup-steps__item ${
                step === "verify" ? "signup-steps__item--active" : ""
              }`}
            >
              <span className="signup-steps__dot">2</span>
              <span>{t("signup.steps.verify")}</span>
            </li>
          </ol>
        </ScrollReveal>

        <ScrollReveal delay={200} className="mt-10">
          <div className="signup-card mx-auto max-w-lg">
            {step === "profile" && (
              <>
                <div className="signup-card__header">
                  <h2 className="text-xl font-bold text-white">
                    {t("signup.profile.title")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {t("signup.profile.subtitle")}
                  </p>
                </div>
                <div className="signup-card__body flex flex-col gap-4">
                  {!alreadyAuthedNeedsProfile && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="signup-field-label">
                          {t("signup.profile.email")}
                        </label>
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                          <Mail className="h-4 w-4 shrink-0 text-purple-300/80" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("login.email_placeholder")}
                            autoComplete="email"
                            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <LegalConsentCheckbox
                        checked={legalAccepted}
                        onChange={setLegalAccepted}
                      />
                    </>
                  )}

                  {profileError && (
                    <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
                      {profileError}
                    </p>
                  )}

                  <OnboardingProfileForm
                    initialDisplayName={profile?.displayName ?? ""}
                    submitLabel={
                      alreadyAuthedNeedsProfile
                        ? t("signup.profile.submit")
                        : sendingCode
                          ? t("login.otp.loading")
                          : t("signup.profile.continue")
                    }
                    onSubmitData={
                      alreadyAuthedNeedsProfile ? undefined : handleProfileData
                    }
                    onSuccess={
                      alreadyAuthedNeedsProfile ? handleProfileSuccess : async () => {}
                    }
                  />
                </div>
                {!alreadyAuthedNeedsProfile && (
                  <p className="signup-card__footer">
                    {t("signup.already_account")}{" "}
                    <Link href="/login?mode=signin" className="signup-card__link">
                      {t("login.mode.signin")}
                    </Link>
                  </p>
                )}
              </>
            )}

            {step === "verify" && pendingProfile && (
              <>
                <div className="signup-card__header">
                  <h2 className="text-xl font-bold text-white">
                    {t("signup.verify.title")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {t("signup.verify.subtitle")}
                  </p>
                </div>
                <div className="signup-card__body">
                  <SignupVerifyStep
                    email={email.trim().toLowerCase()}
                    onVerified={handleVerified}
                    onBack={() => setStep("profile")}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
