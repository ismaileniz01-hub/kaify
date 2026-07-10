"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Leaf,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { SignupVerifyStep } from "@/components/auth/SignupVerifyStep";
import { LegalConsentCheckbox } from "@/components/auth/AuthModeToggle";
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
import {
  maximumBirthDateForMinimumAge,
  meetsMinimumAge,
} from "@/lib/compliance/age";
import {
  EXPERIENCE_LEVELS,
  type Gender,
  type ExperienceLevel,
  type OnboardingInput,
} from "@/lib/validations/onboarding.schema";
import type { ProfileDTO } from "@/lib/types/domain.types";

type WizardStepId =
  | "email"
  | "name"
  | "gender"
  | "birth"
  | "body"
  | "experience"
  | "status"
  | "bio"
  | "verify";

const FULL_FLOW: WizardStepId[] = [
  "email",
  "name",
  "gender",
  "birth",
  "body",
  "experience",
  "status",
  "bio",
  "verify",
];

const AUTHED_FLOW: WizardStepId[] = [
  "name",
  "gender",
  "birth",
  "body",
  "experience",
  "status",
  "bio",
];

const SIGNUP_GENDERS = ["male", "female"] as const satisfies readonly Gender[];

type UnitSystem = "metric" | "imperial";

const CM_PER_IN = 2.54;
const KG_PER_LB = 0.453592;

function inchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_IN);
}

function lbsToKg(lbs: number): number {
  return Math.round(lbs * KG_PER_LB * 10) / 10;
}

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

export function SignupWizard({ redirectTo = "/welcome" }: Props) {
  const { lang, t } = useLang();
  const router = useRouter();
  const { isAuthenticated, isLoading, profile, refreshSession } = useSession();
  const safeRedirect = sanitizeAuthRedirect(redirectTo);

  const alreadyAuthedNeedsProfile =
    isAuthenticated && !isLoading && profile?.onboardingStatus === "PAID";

  const flow = alreadyAuthedNeedsProfile ? AUTHED_FLOW : FULL_FLOW;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [birthDate, setBirthDate] = useState("");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [isNatural, setIsNatural] = useState(true);
  const [bio, setBio] = useState("");

  const currentStep = flow[stepIndex] ?? "email";
  const progressPct = Math.round(((stepIndex + 1) / flow.length) * 100);

  const heightNum = useMemo(() => {
    if (unitSystem === "metric") {
      return Number.parseInt(heightCm, 10);
    }
    const ft = Number.parseInt(heightFt, 10) || 0;
    const inches = Number.parseInt(heightIn, 10) || 0;
    if (ft <= 0 && inches <= 0) return Number.NaN;
    return inchesToCm(ft, inches);
  }, [heightCm, heightFt, heightIn, unitSystem]);

  const weightNum = useMemo(() => {
    if (unitSystem === "metric") {
      return Number.parseFloat(weightKg);
    }
    const lbs = Number.parseFloat(weightLbs);
    if (!Number.isFinite(lbs)) return Number.NaN;
    return lbsToKg(lbs);
  }, [unitSystem, weightKg, weightLbs]);

  useEffect(() => {
    if (isLoading) return;
    if (alreadyAuthedNeedsProfile && profile?.displayName) {
      setDisplayName(profile.displayName);
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

  const buildPayload = useCallback((): OnboardingInput => {
    return {
      displayName: displayName.trim(),
      gender,
      birthDate,
      heightCm: heightNum,
      weightKg: weightNum,
      experienceLevel,
      isNatural,
      bio: bio.trim(),
      locale: lang,
    };
  }, [
    bio,
    birthDate,
    displayName,
    experienceLevel,
    gender,
    heightNum,
    isNatural,
    lang,
    weightNum,
  ]);

  const completeOnboarding = useCallback(
    async (data: OnboardingInput) => {
      await apiPost<ProfileDTO>("/api/onboarding", data);
      await refreshSession();
      router.replace(safeRedirect);
    },
    [refreshSession, router, safeRedirect],
  );

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case "email":
        return email.trim().includes("@") && legalAccepted;
      case "name":
        return displayName.trim().length >= 1;
      case "gender":
        return true;
      case "birth":
        return birthDate.length > 0 && meetsMinimumAge(birthDate);
      case "body":
        return (
          Number.isFinite(heightNum) &&
          heightNum >= 50 &&
          heightNum <= 280 &&
          Number.isFinite(weightNum) &&
          weightNum >= 20 &&
          weightNum <= 500
        );
      case "experience":
      case "status":
      case "bio":
      case "verify":
        return true;
      default:
        return false;
    }
  }, [
    birthDate,
    currentStep,
    displayName,
    email,
    heightNum,
    legalAccepted,
    weightNum,
  ]);

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return;
    setDirection("back");
    setError(null);
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const goNext = useCallback(async () => {
    setError(null);

    if (currentStep === "bio") {
      const payload = buildPayload();
      if (alreadyAuthedNeedsProfile) {
        setBusy(true);
        try {
          await completeOnboarding(payload);
        } catch {
          setError(t("onboarding.error"));
          setBusy(false);
        }
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();
      setBusy(true);
      try {
        storePendingLegalConsent();
        const result = await sendEmailLoginCode(trimmedEmail);
        if (!result.ok) {
          setError(result.message);
          setBusy(false);
          return;
        }
        setDirection("forward");
        setStepIndex((i) => i + 1);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (currentStep === "birth" && birthDate && !meetsMinimumAge(birthDate)) {
      setError(t("signup.wizard.birth.underage"));
      return;
    }

    if (stepIndex < flow.length - 1) {
      setDirection("forward");
      setStepIndex((i) => i + 1);
    }
  }, [
    birthDate,
    alreadyAuthedNeedsProfile,
    buildPayload,
    completeOnboarding,
    currentStep,
    email,
    flow.length,
    stepIndex,
    t,
  ]);

  const handleVerified = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await refreshSession();
      await completeOnboarding(buildPayload());
    } catch {
      setError(t("onboarding.error"));
      setBusy(false);
    }
  }, [buildPayload, completeOnboarding, refreshSession, t]);

  const genderLabel = (g: Gender) => t(`onboarding.gender.${g}` as "onboarding.gender.male");
  const experienceLabel = (level: ExperienceLevel) =>
    t(`onboarding.experience.${level}` as "onboarding.experience.beginner");

  const stepTitle = t(`signup.wizard.${currentStep}.title` as "signup.wizard.email.title");
  const stepSubtitle = t(`signup.wizard.${currentStep}.subtitle` as "signup.wizard.email.subtitle");

  return (
    <section className="signup-hero relative overflow-hidden pb-20 pt-28 sm:pt-32">
      <div className="absolute inset-0">
        <FitnessWallpaper softVignette />
      </div>
      <FloatingOrbs />
      <div className="landing-hero-glow" aria-hidden />

      <div className="landing-container relative z-10">
        <ScrollReveal>
          <div className="mx-auto max-w-xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-purple-300/80">
              {t("signup.page.eyebrow")}
            </p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {t("signup.page.title")}
            </h1>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100} className="mx-auto mt-8 max-w-md">
          <div className="signup-wizard-progress" aria-hidden>
            <div
              className="signup-wizard-progress__fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-500">
            {t("signup.wizard.progress", {
              current: String(stepIndex + 1),
              total: String(flow.length),
            })}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={160} className="mt-8">
          <div className="signup-wizard-card mx-auto max-w-md">
            {currentStep !== "verify" && stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="signup-wizard-back mb-4 flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("signup.wizard.back")}
              </button>
            )}

            {currentStep !== "verify" && (
              <div className="signup-wizard-header">
                <p className="signup-wizard-step-label">
                  {t("signup.wizard.step_label", {
                    current: String(stepIndex + 1),
                    total: String(flow.length),
                  })}
                </p>
                <h2 className="signup-wizard-title">{stepTitle}</h2>
                <p className="signup-wizard-subtitle">{stepSubtitle}</p>
              </div>
            )}

            <div className="signup-wizard-track">
              <div
                key={`${currentStep}-${stepIndex}`}
                className={`signup-wizard-panel ${
                  direction === "back" ? "signup-wizard-panel--back" : ""
                }`}
              >
                {currentStep === "email" && (
                  <div className="flex flex-col gap-4">
                    <div className="signup-wizard-input-wrap">
                      <Mail className="signup-wizard-input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && canContinue && void goNext()}
                        placeholder={t("login.email_placeholder")}
                        autoComplete="email"
                        autoFocus
                        className="signup-wizard-input"
                      />
                    </div>
                    <LegalConsentCheckbox checked={legalAccepted} onChange={setLegalAccepted} />
                  </div>
                )}

                {currentStep === "name" && (
                  <div className="signup-wizard-input-wrap">
                    <User className="signup-wizard-input-icon" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && canContinue && void goNext()}
                      placeholder={t("onboarding.name_placeholder")}
                      autoComplete="name"
                      maxLength={80}
                      autoFocus
                      className="signup-wizard-input signup-wizard-input--lg"
                    />
                  </div>
                )}

                {currentStep === "gender" && (
                  <div className="signup-wizard-options">
                    {SIGNUP_GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`signup-wizard-option ${
                          gender === g ? "signup-wizard-option--active" : ""
                        }`}
                      >
                        {genderLabel(g)}
                      </button>
                    ))}
                  </div>
                )}

                {currentStep === "birth" && (
                  <input
                    type="date"
                    value={birthDate}
                    max={maximumBirthDateForMinimumAge()}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBirthDate(value);
                      if (value && !meetsMinimumAge(value)) {
                        setError(t("signup.wizard.birth.underage"));
                      } else {
                        setError(null);
                      }
                    }}
                    autoFocus
                    className="signup-wizard-field signup-wizard-field--center text-lg"
                  />
                )}

                {currentStep === "body" && (
                  <div className="flex flex-col gap-4">
                    <div className="signup-unit-toggle" role="group" aria-label={t("signup.wizard.units.label")}>
                      <button
                        type="button"
                        onClick={() => setUnitSystem("metric")}
                        className={`signup-unit-toggle__btn ${
                          unitSystem === "metric" ? "signup-unit-toggle__btn--active" : ""
                        }`}
                      >
                        {t("signup.wizard.units.metric")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnitSystem("imperial")}
                        className={`signup-unit-toggle__btn ${
                          unitSystem === "imperial" ? "signup-unit-toggle__btn--active" : ""
                        }`}
                      >
                        {t("signup.wizard.units.imperial")}
                      </button>
                    </div>

                    {unitSystem === "metric" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                          <label className="signup-field-label text-center">
                            {t("signup.wizard.height_cm")}
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={heightCm}
                            onChange={(e) => setHeightCm(e.target.value)}
                            placeholder={t("onboarding.height_placeholder")}
                            autoFocus
                            className="signup-wizard-field signup-wizard-field--center text-lg"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="signup-field-label text-center">
                            {t("signup.wizard.weight_kg")}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            placeholder={t("onboarding.weight_placeholder")}
                            className="signup-wizard-field signup-wizard-field--center text-lg"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-2">
                            <label className="signup-field-label text-center">
                              {t("signup.wizard.height_ft")}
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={9}
                              value={heightFt}
                              onChange={(e) => setHeightFt(e.target.value)}
                              placeholder="5"
                              autoFocus
                              className="signup-wizard-field signup-wizard-field--center text-lg"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="signup-field-label text-center">
                              {t("signup.wizard.height_in")}
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={11}
                              value={heightIn}
                              onChange={(e) => setHeightIn(e.target.value)}
                              placeholder="10"
                              className="signup-wizard-field signup-wizard-field--center text-lg"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="signup-field-label text-center">
                            {t("signup.wizard.weight_lbs")}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={weightLbs}
                            onChange={(e) => setWeightLbs(e.target.value)}
                            placeholder="165"
                            className="signup-wizard-field signup-wizard-field--center text-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === "experience" && (
                  <div className="flex flex-col gap-2">
                    {EXPERIENCE_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setExperienceLevel(level)}
                        className={`signup-wizard-option signup-wizard-option--row ${
                          experienceLevel === level ? "signup-wizard-option--active" : ""
                        }`}
                      >
                        {experienceLabel(level)}
                      </button>
                    ))}
                  </div>
                )}

                {currentStep === "status" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsNatural(true)}
                      className={`signup-wizard-option signup-wizard-option--tile ${
                        isNatural
                          ? "signup-wizard-option--active signup-wizard-option--natural"
                          : ""
                      }`}
                    >
                      <Leaf className="h-6 w-6" />
                      <span>{t("onboarding.natural")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNatural(false)}
                      className={`signup-wizard-option signup-wizard-option--tile ${
                        !isNatural
                          ? "signup-wizard-option--active signup-wizard-option--enhanced"
                          : ""
                      }`}
                    >
                      <Sparkles className="h-6 w-6" />
                      <span>{t("onboarding.enhanced")}</span>
                    </button>
                  </div>
                )}

                {currentStep === "bio" && (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder={t("onboarding.bio_placeholder")}
                    autoFocus
                    className="signup-wizard-field resize-none text-base"
                  />
                )}

                {currentStep === "verify" && (
                  <div>
                    <div className="signup-wizard-header !mb-5 !px-0 !pt-0">
                      <h2 className="signup-wizard-title">{t("signup.verify.title")}</h2>
                      <p className="signup-wizard-subtitle">{t("signup.verify.subtitle")}</p>
                    </div>
                    <SignupVerifyStep
                      email={email.trim().toLowerCase()}
                      onVerified={handleVerified}
                      onBack={goBack}
                    />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
                {error}
              </p>
            )}

            {currentStep !== "verify" && (
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={!canContinue || busy}
                  className="landing-btn landing-btn--primary flex w-full items-center justify-center gap-2 disabled:opacity-40"
                >
                  {busy
                    ? t("login.otp.loading")
                    : currentStep === "bio"
                      ? alreadyAuthedNeedsProfile
                        ? t("signup.profile.submit")
                        : t("signup.wizard.send_code")
                      : t("signup.wizard.continue")}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {currentStep === "bio" && (
                  <button
                    type="button"
                    onClick={() => {
                      setBio("");
                      void goNext();
                    }}
                    disabled={busy}
                    className="text-center text-sm text-zinc-500 transition hover:text-zinc-300"
                  >
                    {t("signup.wizard.skip_bio")}
                  </button>
                )}
              </div>
            )}

            {stepIndex === 0 && !alreadyAuthedNeedsProfile && (
              <p className="signup-card__footer mt-4 !border-t-0 !px-0 !pb-0">
                {t("signup.already_account")}{" "}
                <Link href="/login?mode=signin" className="signup-card__link">
                  {t("login.mode.signin")}
                </Link>
              </p>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
