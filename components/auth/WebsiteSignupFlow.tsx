"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { EmailOtpLogin } from "@/components/auth/EmailOtpLogin";
import { OnboardingProfileForm } from "@/components/onboarding/OnboardingProfileForm";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { FloatingOrbs } from "@/components/landing/FloatingOrbs";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-redirect";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";

type SignupStep = "auth" | "profile";

const STEPS: SignupStep[] = ["auth", "profile"];

type Props = {
  redirectTo?: string;
};

export function WebsiteSignupFlow({ redirectTo = "/welcome" }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const { isAuthenticated, isLoading, profile, refreshSession } = useSession();
  const safeRedirect = sanitizeAuthRedirect(redirectTo);

  const [step, setStep] = useState<SignupStep>("auth");
  const [authSubStep, setAuthSubStep] = useState<"email" | "code">("email");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setStep("auth");
      return;
    }
    if (!profile) return;
    if (profile.onboardingStatus === "PAID") {
      setStep("profile");
      return;
    }
    router.replace(safeRedirect);
  }, [isAuthenticated, isLoading, profile, router, safeRedirect]);

  const handleAuthSuccess = useCallback(() => {
    setStep("profile");
  }, []);

  const handleProfileSuccess = useCallback(async () => {
    await refreshSession();
    router.replace(safeRedirect);
  }, [refreshSession, router, safeRedirect]);

  const stepIndex = STEPS.indexOf(step);

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
              <span>{t("signup.steps.email")}</span>
            </li>
            <li
              className={`signup-steps__item ${
                authSubStep === "code" || step === "profile"
                  ? "signup-steps__item--active"
                  : ""
              } ${step === "profile" ? "signup-steps__item--done" : ""}`}
            >
              <span className="signup-steps__dot">
                {step === "profile" ? <Check className="h-3.5 w-3.5" /> : "2"}
              </span>
              <span>{t("signup.steps.verify")}</span>
            </li>
            <li
              className={`signup-steps__item ${
                step === "profile" ? "signup-steps__item--active" : ""
              }`}
            >
              <span className="signup-steps__dot">3</span>
              <span>{t("signup.steps.profile")}</span>
            </li>
          </ol>
        </ScrollReveal>

        <ScrollReveal delay={200} className="mt-10">
          <div className="signup-card mx-auto max-w-lg">
            {step === "auth" && (
              <>
                <div className="signup-card__header">
                  <h2 className="text-xl font-bold text-white">
                    {authSubStep === "code"
                      ? t("login.otp.title")
                      : t("signup.auth.title")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {authSubStep === "code"
                      ? t("login.signup.otp_subtitle")
                      : t("signup.auth.subtitle")}
                  </p>
                </div>
                <div className="signup-card__body">
                  <EmailOtpLogin
                    mode="signup"
                    skipAutoRedirect
                    onAuthSuccess={handleAuthSuccess}
                    onStepChange={setAuthSubStep}
                  />
                </div>
                <p className="signup-card__footer">
                  {t("signup.already_account")}{" "}
                  <Link href="/login?mode=signin" className="signup-card__link">
                    {t("login.mode.signin")}
                  </Link>
                </p>
              </>
            )}

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
                <div className="signup-card__body">
                  <OnboardingProfileForm
                    initialDisplayName={profile?.displayName ?? ""}
                    submitLabel={t("signup.profile.submit")}
                    onSuccess={handleProfileSuccess}
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
