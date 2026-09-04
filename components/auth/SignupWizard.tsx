"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
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
import { apiErrorMessage } from "@/lib/i18n/api-error";
import {
  executeInvisibleRecaptcha,
  InvisibleRecaptcha,
  useInvisibleRecaptchaRef,
} from "@/components/security/InvisibleRecaptcha";
import { hasPaidPlan } from "@/lib/auth/post-auth-redirect";
import { hapticSelection } from "@/lib/native/haptics";
import { useScrollFocusedInputIntoView } from "@/hooks/useScrollFocusedInputIntoView";
import { redirectToWebCheckoutAfterSignup } from "@/lib/billing/native-web-checkout";
import {
  PENDING_LEGAL_CONSENT_KEY,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { apiPost } from "@/lib/api/client";
import { postClientProductEvent } from "@/lib/events/client-beacon";
import { COUNTRY_OPTIONS } from "@/lib/country-names";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import {
  maximumBirthDateForMinimumAge,
  meetsMinimumAge,
} from "@/lib/compliance/age";
import {
  ACTIVITY_LEVELS,
  DIETARY_PREFERENCES,
  EQUIPMENT_ACCESS_OPTIONS,
  EXPERIENCE_LEVELS,
  GENDERS,
  type ActivityLevel,
  type DietaryPreference,
  type EquipmentAccess,
  type ExperienceLevel,
  type Gender,
  type OnboardingInput,
} from "@/lib/validations/onboarding.schema";
import {
  PRIMARY_GOALS,
  type PrimaryGoal,
} from "@/lib/validations/goals.schema";
import { otpSendSchema } from "@/lib/validations/auth-otp.schema";
import {
  clearPendingReferral,
  getPendingReferral,
  setPendingReferral,
  REFERRAL_APPLIED_EVENT,
} from "@/lib/referral";
import { referralCodeSchema } from "@/lib/validations/referral.schema";
import type { ProfileDTO } from "@/lib/types/domain.types";

type WizardStepId =
  | "email"
  | "name"
  | "gender"
  | "birth"
  | "body"
  | "goal"
  | "activity"
  | "experience"
  | "status"
  | "lifestyle"
  | "country"
  | "bio"
  | "referral"
  | "verify";

const FULL_FLOW: WizardStepId[] = [
  "email",
  "name",
  "birth",
  "country",
  "referral",
  "verify",
];

const AUTHED_FLOW: WizardStepId[] = [
  "name",
  "gender",
  "birth",
  "body",
  "goal",
  "activity",
  "experience",
  "status",
  "lifestyle",
  "country",
  "bio",
  "referral",
];

const TRAINING_DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

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

export function SignupWizard({ redirectTo = "/pricing" }: Props) {
  void redirectTo;
  const { lang, t } = useLang();
  useScrollFocusedInputIntoView();
  const { isAuthenticated, isLoading, profile, refreshSession } = useSession();
  const idPrefix = useId();
  const errorId = `${idPrefix}-error`;
  const fid = (name: string) => `${idPrefix}-${name}`;

  const alreadyAuthedNeedsProfile =
    isAuthenticated && !isLoading && profile?.onboardingStatus === "PAID";

  const [flowKind, setFlowKind] = useState<"pending" | "full" | "authed">("pending");
  useEffect(() => {
    if (isLoading || flowKind !== "pending") return;
    setFlowKind(alreadyAuthedNeedsProfile ? "authed" : "full");
  }, [alreadyAuthedNeedsProfile, flowKind, isLoading]);

  useEffect(() => {
    if (flowKind === "pending") return;
    if (flowKind === "full") {
      postClientProductEvent({
        name: "signup.started",
        properties: { flow: "email", method: "otp" },
      });
      postClientProductEvent({
        name: "onboarding.started",
        properties: { flow: "signup", version: "v2" },
      });
      return;
    }
    postClientProductEvent({
      name: "onboarding.started",
      properties: { flow: "lifestyle", version: "v2" },
    });
  }, [flowKind]);

  const flow = flowKind === "authed" ? AUTHED_FLOW : FULL_FLOW;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  useEffect(() => {
    if (flowKind === "pending") return;
    const step = flow[stepIndex];
    if (!step) return;
    postClientProductEvent({
      name: "onboarding.step_viewed",
      properties: { flow: flowKind === "authed" ? "lifestyle" : "signup", step },
    });
  }, [flow, flowKind, stepIndex]);
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
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>("build_muscle");
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>("moderately_active");
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(3);
  const [equipmentAccess, setEquipmentAccess] = useState<EquipmentAccess>("gym");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [isNatural, setIsNatural] = useState(true);
  const [dietaryPreference, setDietaryPreference] =
    useState<DietaryPreference>("omnivore");
  const [allergies, setAllergies] = useState("");
  const [dislikedFoods, setDislikedFoods] = useState("");
  const [healthConditions, setHealthConditions] = useState("");
  const [countryCode, setCountryCode] = useState(lang === "tr" ? "TR" : "");
  const [bio, setBio] = useState("");
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const captchaRef = useInvisibleRecaptchaRef();

  useEffect(() => {
    const pending = getPendingReferral();
    if (pending) setReferralCodeInput(pending);
  }, []);

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
      if (hasPaidPlan(profile)) {
        return;
      }
      void redirectToWebCheckoutAfterSignup();
    }
  }, [
    alreadyAuthedNeedsProfile,
    isAuthenticated,
    isLoading,
    profile,
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
      primaryGoal,
      activityLevel,
      trainingDaysPerWeek,
      equipmentAccess,
      dietaryPreference,
      allergies: allergies.trim(),
      dislikedFoods: dislikedFoods.trim(),
      healthConditions: healthConditions.trim(),
      countryCode,
    };
  }, [
    activityLevel,
    allergies,
    bio,
    birthDate,
    countryCode,
    dietaryPreference,
    dislikedFoods,
    displayName,
    equipmentAccess,
    experienceLevel,
    gender,
    healthConditions,
    heightNum,
    isNatural,
    lang,
    primaryGoal,
    trainingDaysPerWeek,
    weightNum,
  ]);

  const completeOnboarding = useCallback(
    async (data: OnboardingInput) => {
      await apiPost<ProfileDTO>("/api/onboarding", data);
      await refreshSession();
      // Always collect payment on the website. Do not open /welcome unpaid.
      await redirectToWebCheckoutAfterSignup();
    },
    [refreshSession],
  );

  const saveSignupBasicsAndCheckout = useCallback(async () => {
    await apiPost("/api/onboarding/basics", {
      displayName: displayName.trim(),
      birthDate,
      countryCode,
      locale: lang,
    });
    await refreshSession();
    await redirectToWebCheckoutAfterSignup();
  }, [birthDate, countryCode, displayName, lang, refreshSession]);

  const canContinue = useMemo(() => {
    switch (currentStep) {
      case "email":
        return otpSendSchema.safeParse({ email: email.trim() }).success && legalAccepted;
      case "name":
        return displayName.trim().length >= 1;
      case "gender":
      case "goal":
      case "experience":
      case "status":
      case "lifestyle":
      case "bio":
      case "verify":
        return true;
      case "referral": {
        const raw = referralCodeInput.trim();
        if (!raw) return true;
        return referralCodeSchema.safeParse(raw).success;
      }
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
      case "activity":
        return trainingDaysPerWeek >= 0 && trainingDaysPerWeek <= 7;
      case "country":
        return /^[A-Za-z]{2}$/.test(countryCode);
      default:
        return false;
    }
  }, [
    birthDate,
    countryCode,
    currentStep,
    displayName,
    email,
    heightNum,
    legalAccepted,
    referralCodeInput,
    trainingDaysPerWeek,
    weightNum,
  ]);

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return;
    void hapticSelection();
    setDirection("back");
    setError(null);
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const finishReferralStep = useCallback(
    async (code: string | null) => {
      setPendingReferral(code);
      if (alreadyAuthedNeedsProfile) {
        setBusy(true);
        try {
          await completeOnboarding(buildPayload());
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
        const recaptchaToken = await executeInvisibleRecaptcha(captchaRef);
        const result = await sendEmailLoginCode(
          trimmedEmail,
          recaptchaToken,
          lang === "tr" ? "tr" : "en",
        );
        if (!result.ok) {
          setError(apiErrorMessage(result.code, t));
          setBusy(false);
          return;
        }
        setDirection("forward");
        setStepIndex((i) => i + 1);
      } finally {
        setBusy(false);
      }
    },
    [
      alreadyAuthedNeedsProfile,
      buildPayload,
      captchaRef,
      completeOnboarding,
      email,
      lang,
      t,
    ],
  );

  const goNext = useCallback(async () => {
    void hapticSelection();
    setError(null);

    if (currentStep === "referral") {
      const raw = referralCodeInput.trim();
      if (raw) {
        const parsed = referralCodeSchema.safeParse(raw);
        if (!parsed.success) {
          setError(t("signup.wizard.referral.invalid"));
          return;
        }
        await finishReferralStep(parsed.data);
      } else {
        await finishReferralStep(null);
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
    currentStep,
    finishReferralStep,
    flow.length,
    referralCodeInput,
    stepIndex,
    t,
  ]);

  const handleVerified = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await refreshSession();
      const code = getPendingReferral();
      if (code) {
        try {
          await apiPost("/api/referral", { code });
          window.dispatchEvent(new Event(REFERRAL_APPLIED_EVENT));
        } catch {
          // Invalid / unknown codes must not skip checkout.
        }
        clearPendingReferral();
      }
      if (alreadyAuthedNeedsProfile) {
        await completeOnboarding(buildPayload());
      } else {
        await saveSignupBasicsAndCheckout();
      }
    } catch {
      setError(t("onboarding.error"));
      setBusy(false);
    }
  }, [
    alreadyAuthedNeedsProfile,
    buildPayload,
    completeOnboarding,
    refreshSession,
    saveSignupBasicsAndCheckout,
    t,
  ]);

  const genderLabel = (g: Gender) => t(`onboarding.gender.${g}` as "onboarding.gender.male");
  const experienceLabel = (level: ExperienceLevel) =>
    t(`onboarding.experience.${level}` as "onboarding.experience.beginner");
  const goalLabel = (goal: PrimaryGoal) =>
    t(`goals.primary.${goal}` as "goals.primary.build_muscle");
  const activityLabel = (level: ActivityLevel) =>
    t(`onboarding.activity.${level}` as "onboarding.activity.sedentary");
  const dietLabel = (pref: DietaryPreference) =>
    t(`onboarding.diet.${pref}` as "onboarding.diet.omnivore");
  const equipmentLabel = (value: EquipmentAccess) =>
    t(`onboarding.equipment.${value}` as "onboarding.equipment.home");

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
          <div
            className="signup-wizard-progress-sticky"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={flow.length}
            aria-valuenow={stepIndex + 1}
            aria-label={t("signup.wizard.progress", {
              current: String(stepIndex + 1),
              total: String(flow.length),
            })}
          >
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
          </div>
        </ScrollReveal>

        <ScrollReveal delay={160} className="mt-8">
          <div className="signup-wizard-card mx-auto max-w-md">
            {currentStep !== "verify" && stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="signup-wizard-back mb-4 flex min-h-11 items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white"
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
                      <label htmlFor={fid("email")} className="sr-only">
                        {t("login.email_placeholder")}
                      </label>
                      <Mail className="signup-wizard-input-icon" aria-hidden />
                      <input
                        id={fid("email")}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && canContinue && void goNext()}
                        placeholder={t("login.email_placeholder")}
                        autoComplete="email"
                        autoFocus
                        className="signup-wizard-input"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                      />
                    </div>
                    <LegalConsentCheckbox checked={legalAccepted} onChange={setLegalAccepted} />
                  </div>
                )}

                {currentStep === "name" && (
                  <div className="signup-wizard-input-wrap">
                    <label htmlFor={fid("name")} className="sr-only">
                      {t("onboarding.name")}
                    </label>
                    <User className="signup-wizard-input-icon" aria-hidden />
                    <input
                      id={fid("name")}
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && canContinue && void goNext()}
                      placeholder={t("onboarding.name_placeholder")}
                      autoComplete="name"
                      maxLength={80}
                      autoFocus
                      className="signup-wizard-input signup-wizard-input--lg"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                  </div>
                )}

                {currentStep === "gender" && (
                  <div className="signup-wizard-options">
                    {GENDERS.map((g) => (
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
                  <>
                    <label htmlFor={fid("birth")} className="sr-only">
                      {t("onboarding.birth_date")}
                    </label>
                    <input
                      id={fid("birth")}
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
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                  </>
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
                          <label htmlFor={fid("height-cm")} className="signup-field-label text-center">
                            {t("signup.wizard.height_cm")}
                          </label>
                          <input
                            id={fid("height-cm")}
                            type="number"
                            inputMode="numeric"
                            value={heightCm}
                            onChange={(e) => setHeightCm(e.target.value)}
                            placeholder={t("onboarding.height_placeholder")}
                            autoFocus
                            className="signup-wizard-field signup-wizard-field--center text-lg"
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? errorId : undefined}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label htmlFor={fid("weight-kg")} className="signup-field-label text-center">
                            {t("signup.wizard.weight_kg")}
                          </label>
                          <input
                            id={fid("weight-kg")}
                            type="number"
                            inputMode="decimal"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            placeholder={t("onboarding.weight_placeholder")}
                            className="signup-wizard-field signup-wizard-field--center text-lg"
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? errorId : undefined}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-2">
                            <label htmlFor={fid("height-ft")} className="signup-field-label text-center">
                              {t("signup.wizard.height_ft")}
                            </label>
                            <input
                              id={fid("height-ft")}
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={9}
                              value={heightFt}
                              onChange={(e) => setHeightFt(e.target.value)}
                              placeholder="5"
                              autoFocus
                              className="signup-wizard-field signup-wizard-field--center text-lg"
                              aria-invalid={error ? true : undefined}
                              aria-describedby={error ? errorId : undefined}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label htmlFor={fid("height-in")} className="signup-field-label text-center">
                              {t("signup.wizard.height_in")}
                            </label>
                            <input
                              id={fid("height-in")}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={11}
                              value={heightIn}
                              onChange={(e) => setHeightIn(e.target.value)}
                              placeholder="10"
                              className="signup-wizard-field signup-wizard-field--center text-lg"
                              aria-invalid={error ? true : undefined}
                              aria-describedby={error ? errorId : undefined}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label htmlFor={fid("weight-lbs")} className="signup-field-label text-center">
                            {t("signup.wizard.weight_lbs")}
                          </label>
                          <input
                            id={fid("weight-lbs")}
                            type="number"
                            inputMode="decimal"
                            value={weightLbs}
                            onChange={(e) => setWeightLbs(e.target.value)}
                            placeholder="165"
                            className="signup-wizard-field signup-wizard-field--center text-lg"
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? errorId : undefined}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === "goal" && (
                  <div className="flex flex-col gap-2">
                    {PRIMARY_GOALS.map((goal) => (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => setPrimaryGoal(goal)}
                        className={`signup-wizard-option signup-wizard-option--row ${
                          primaryGoal === goal ? "signup-wizard-option--active" : ""
                        }`}
                      >
                        {goalLabel(goal)}
                      </button>
                    ))}
                  </div>
                )}

                {currentStep === "activity" && (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      {ACTIVITY_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setActivityLevel(level)}
                          className={`signup-wizard-option signup-wizard-option--row ${
                            activityLevel === level ? "signup-wizard-option--active" : ""
                          }`}
                        >
                          {activityLabel(level)}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label id={fid("training-label")} className="signup-field-label text-center">
                        {t("signup.wizard.training_days")}
                      </label>
                      <div
                        className="grid grid-cols-4 gap-2"
                        role="group"
                        aria-labelledby={fid("training-label")}
                      >
                        {TRAINING_DAY_OPTIONS.map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setTrainingDaysPerWeek(days)}
                            aria-pressed={trainingDaysPerWeek === days}
                            className={`signup-wizard-option ${
                              trainingDaysPerWeek === days
                                ? "signup-wizard-option--active"
                                : ""
                            }`}
                          >
                            {days}
                          </button>
                        ))}
                      </div>
                      <p id={fid("training-hint")} className="text-center text-[11px] text-zinc-500">
                        {t("signup.wizard.training_days_hint")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label id={fid("equipment-label")} className="signup-field-label text-center">
                        {t("onboarding.equipment")}
                      </label>
                      <div
                        className="grid grid-cols-3 gap-2"
                        role="group"
                        aria-labelledby={fid("equipment-label")}
                      >
                        {EQUIPMENT_ACCESS_OPTIONS.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setEquipmentAccess(value)}
                            aria-pressed={equipmentAccess === value}
                            className={`signup-wizard-option ${
                              equipmentAccess === value
                                ? "signup-wizard-option--active"
                                : ""
                            }`}
                          >
                            {equipmentLabel(value)}
                          </button>
                        ))}
                      </div>
                    </div>
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

                {currentStep === "lifestyle" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="signup-field-label">{t("onboarding.diet")}</label>
                      <div className="grid grid-cols-2 gap-2">
                        {DIETARY_PREFERENCES.map((pref) => (
                          <button
                            key={pref}
                            type="button"
                            onClick={() => setDietaryPreference(pref)}
                            className={`signup-wizard-option ${
                              dietaryPreference === pref
                                ? "signup-wizard-option--active"
                                : ""
                            }`}
                          >
                            {dietLabel(pref)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={fid("allergies")} className="signup-field-label">
                        {t("signup.wizard.allergies")}
                      </label>
                      <textarea
                        id={fid("allergies")}
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder={t("signup.wizard.allergies_placeholder")}
                        className="signup-wizard-field resize-none text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={fid("disliked")} className="signup-field-label">
                        {t("signup.wizard.disliked_foods")}
                      </label>
                      <textarea
                        id={fid("disliked")}
                        value={dislikedFoods}
                        onChange={(e) => setDislikedFoods(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder={t("signup.wizard.disliked_foods_placeholder")}
                        className="signup-wizard-field resize-none text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={fid("health")} className="signup-field-label">
                        {t("signup.wizard.health_conditions")}
                      </label>
                      <textarea
                        id={fid("health")}
                        value={healthConditions}
                        onChange={(e) => setHealthConditions(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder={t("signup.wizard.health_conditions_placeholder")}
                        className="signup-wizard-field resize-none text-sm"
                      />
                    </div>
                  </div>
                )}

                {currentStep === "country" && (
                  <>
                    <label htmlFor={fid("country")} className="sr-only">
                      {t("onboarding.country")}
                    </label>
                    <select
                      id={fid("country")}
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      autoFocus
                      className="signup-wizard-field text-base"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                    >
                      <option value="" className="bg-zinc-900">
                        {t("signup.wizard.country_placeholder")}
                      </option>
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code} className="bg-zinc-900">
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {currentStep === "bio" && (
                  <>
                    <label htmlFor={fid("bio")} className="sr-only">
                      {t("onboarding.bio")}
                    </label>
                    <textarea
                      id={fid("bio")}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      placeholder={t("onboarding.bio_placeholder")}
                      autoFocus
                      className="signup-wizard-field resize-none text-base"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                    />
                  </>
                )}

                {currentStep === "referral" && (
                  <div className="flex flex-col gap-3">
                    <label htmlFor={fid("referral")} className="sr-only">
                      {t("signup.wizard.referral.title")}
                    </label>
                    <input
                      id={fid("referral")}
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={20}
                      value={referralCodeInput}
                      onChange={(e) =>
                        setReferralCodeInput(e.target.value.toUpperCase())
                      }
                      placeholder={t("signup.wizard.referral.placeholder")}
                      autoFocus
                      className="signup-wizard-field font-mono text-base tracking-wider uppercase"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={
                        error ? errorId : fid("referral-hint")
                      }
                    />
                    <p id={fid("referral-hint")} className="text-center text-[11px] text-zinc-500">
                      {t("signup.wizard.referral.hint")}
                    </p>
                  </div>
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
              <p
                id={errorId}
                role="alert"
                className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200"
              >
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
                    : currentStep === "referral"
                      ? alreadyAuthedNeedsProfile
                        ? t("signup.profile.submit")
                        : t("signup.wizard.send_code")
                      : t("signup.wizard.continue")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>

                {currentStep === "lifestyle" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAllergies("");
                      setDislikedFoods("");
                      setHealthConditions("");
                      void goNext();
                    }}
                    disabled={busy}
                    className="min-h-11 text-center text-sm text-zinc-500 transition hover:text-zinc-300"
                  >
                    {t("signup.wizard.skip_lifestyle")}
                  </button>
                )}

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

                {currentStep === "referral" && (
                  <button
                    type="button"
                    onClick={() => {
                      setReferralCodeInput("");
                      setError(null);
                      void finishReferralStep(null);
                    }}
                    disabled={busy}
                    className="text-center text-sm text-zinc-500 transition hover:text-zinc-300"
                  >
                    {t("signup.wizard.referral.skip")}
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
        <InvisibleRecaptcha captchaRef={captchaRef} />
      </div>
    </section>
  );
}
