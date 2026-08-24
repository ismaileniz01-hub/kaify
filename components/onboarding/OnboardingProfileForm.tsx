"use client";

import { useMemo, useState, useId } from "react";
import { Leaf, Sparkles, ArrowRight } from "lucide-react";
import { apiPost, ApiClientError } from "@/lib/api/client";
import { COUNTRY_OPTIONS } from "@/lib/country-names";
import { useLang } from "@/lib/lang-context";
import { errorToMessage } from "@/lib/i18n/api-error";
import { InlineAlert } from "@/components/InlineAlert";
import type { ProfileDTO } from "@/lib/types/domain.types";
import type { OnboardingInput } from "@/lib/validations/onboarding.schema";
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
} from "@/lib/validations/onboarding.schema";
import {
  PRIMARY_GOALS,
  type PrimaryGoal,
} from "@/lib/validations/goals.schema";
import { maximumBirthDateForMinimumAge } from "@/lib/compliance/age";

const TRAINING_DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

type Props = {
  initialDisplayName?: string;
  submitLabel?: string;
  className?: string;
  /** When set, skips API call and returns validated form data to the parent. */
  onSubmitData?: (data: OnboardingInput) => void | Promise<void>;
  onSuccess: () => void | Promise<void>;
};

export function OnboardingProfileForm({
  initialDisplayName = "",
  submitLabel,
  className = "",
  onSubmitData,
  onSuccess,
}: Props) {
  const { lang, t } = useLang();
  const idPrefix = useId();
  const errorId = `${idPrefix}-error`;
  const hintId = `${idPrefix}-hint`;
  const birthHintId = `${idPrefix}-birth-hint`;

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [gender, setGender] = useState<Gender>("prefer_not_to_say");
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>("build_muscle");
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>("moderately_active");
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(3);
  const [equipmentAccess, setEquipmentAccess] = useState<EquipmentAccess>("gym");
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>("beginner");
  const [isNatural, setIsNatural] = useState(true);
  const [dietaryPreference, setDietaryPreference] =
    useState<DietaryPreference>("omnivore");
  const [allergies, setAllergies] = useState("");
  const [dislikedFoods, setDislikedFoods] = useState("");
  const [healthConditions, setHealthConditions] = useState("");
  const [countryCode, setCountryCode] = useState(lang === "tr" ? "TR" : "");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

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

  const heightNum = Number.parseInt(heightCm, 10);
  const weightNum = Number.parseFloat(weightKg);

  const fieldInvalid = {
    displayName: displayName.trim().length < 1,
    birthDate: birthDate.length === 0,
    heightCm: !(Number.isFinite(heightNum) && heightNum >= 50 && heightNum <= 280),
    weightKg: !(Number.isFinite(weightNum) && weightNum >= 20 && weightNum <= 500),
    countryCode: !/^[A-Za-z]{2}$/.test(countryCode),
  };

  const valid = useMemo(() => {
    return (
      !fieldInvalid.displayName &&
      !fieldInvalid.birthDate &&
      !fieldInvalid.heightCm &&
      !fieldInvalid.weightKg &&
      !fieldInvalid.countryCode
    );
  }, [
    fieldInvalid.displayName,
    fieldInvalid.birthDate,
    fieldInvalid.heightCm,
    fieldInvalid.weightKg,
    fieldInvalid.countryCode,
  ]);

  const describe = (...ids: Array<string | false | null | undefined>) =>
    ids.filter(Boolean).join(" ") || undefined;

  const handleSubmit = async () => {
    setAttempted(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);

    const payload: OnboardingInput = {
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

    try {
      if (onSubmitData) {
        try {
          await onSubmitData(payload);
        } finally {
          setSubmitting(false);
        }
        return;
      }

      await apiPost<ProfileDTO>("/api/onboarding", payload);
      await onSuccess();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(errorToMessage(err, t));
      } else {
        setError(t("onboarding.error"));
      }
      setSubmitting(false);
    }
  };

  const fid = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("name")} className="signup-field-label">
          {t("onboarding.name")}
        </label>
        <input
          id={fid("name")}
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          className="signup-field-input"
          placeholder={t("onboarding.name_placeholder")}
          aria-invalid={attempted && fieldInvalid.displayName ? true : undefined}
          aria-describedby={describe(
            attempted && fieldInvalid.displayName && hintId,
            error && errorId,
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("gender")} className="signup-field-label">
          {t("onboarding.gender")}
        </label>
        <select
          id={fid("gender")}
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender)}
          className="signup-field-input"
          aria-describedby={describe(error && errorId)}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g} className="bg-zinc-900">
              {genderLabel(g)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("birth")} className="signup-field-label">
          {t("onboarding.birth_date")}
        </label>
        <input
          id={fid("birth")}
          type="date"
          value={birthDate}
          max={maximumBirthDateForMinimumAge()}
          onChange={(e) => setBirthDate(e.target.value)}
          className="signup-field-input"
          aria-invalid={attempted && fieldInvalid.birthDate ? true : undefined}
          aria-describedby={describe(
            birthHintId,
            attempted && fieldInvalid.birthDate && hintId,
            error && errorId,
          )}
        />
        <p id={birthHintId} className="text-[10px] text-zinc-500">
          {t("onboarding.birth_date_hint")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fid("height")} className="signup-field-label">
            {t("onboarding.height")}
          </label>
          <input
            id={fid("height")}
            type="number"
            inputMode="numeric"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="signup-field-input"
            placeholder={t("onboarding.height_placeholder")}
            aria-invalid={attempted && fieldInvalid.heightCm ? true : undefined}
            aria-describedby={describe(
              attempted && fieldInvalid.heightCm && hintId,
              error && errorId,
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fid("weight")} className="signup-field-label">
            {t("onboarding.weight")}
          </label>
          <input
            id={fid("weight")}
            type="number"
            inputMode="decimal"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="signup-field-input"
            placeholder={t("onboarding.weight_placeholder")}
            aria-invalid={attempted && fieldInvalid.weightKg ? true : undefined}
            aria-describedby={describe(
              attempted && fieldInvalid.weightKg && hintId,
              error && errorId,
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("goal")} className="signup-field-label">
          {t("onboarding.primary_goal")}
        </label>
        <select
          id={fid("goal")}
          value={primaryGoal}
          onChange={(e) => setPrimaryGoal(e.target.value as PrimaryGoal)}
          className="signup-field-input"
        >
          {PRIMARY_GOALS.map((goal) => (
            <option key={goal} value={goal} className="bg-zinc-900">
              {goalLabel(goal)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("activity")} className="signup-field-label">
          {t("onboarding.activity")}
        </label>
        <select
          id={fid("activity")}
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
          className="signup-field-input"
        >
          {ACTIVITY_LEVELS.map((level) => (
            <option key={level} value={level} className="bg-zinc-900">
              {activityLabel(level)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label id={fid("training-label")} className="signup-field-label">
          {t("onboarding.training_days")}
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
              className={`rounded-xl border py-2.5 text-xs font-medium transition ${
                trainingDaysPerWeek === days
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
              }`}
            >
              {days}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label id={fid("experience-label")} className="signup-field-label">
          {t("onboarding.experience")}
        </label>
        <div
          className="grid grid-cols-3 gap-2"
          role="group"
          aria-labelledby={fid("experience-label")}
        >
          {EXPERIENCE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setExperienceLevel(level)}
              aria-pressed={experienceLevel === level}
              className={`rounded-xl border py-2.5 text-xs font-medium transition ${
                experienceLevel === level
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
              }`}
            >
              {experienceLabel(level)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("equipment")} className="signup-field-label">
          {t("onboarding.equipment")}
        </label>
        <select
          id={fid("equipment")}
          value={equipmentAccess}
          onChange={(e) => setEquipmentAccess(e.target.value as EquipmentAccess)}
          className="signup-field-input"
        >
          {EQUIPMENT_ACCESS_OPTIONS.map((value) => (
            <option key={value} value={value} className="bg-zinc-900">
              {equipmentLabel(value)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label id={fid("status-label")} className="signup-field-label">
          {t("onboarding.status")}
        </label>
        <div className="flex gap-2" role="group" aria-labelledby={fid("status-label")}>
          <button
            type="button"
            onClick={() => setIsNatural(true)}
            aria-pressed={isNatural}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
              isNatural
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
            }`}
          >
            <Leaf className="h-4 w-4" />
            {t("onboarding.natural")}
          </button>
          <button
            type="button"
            onClick={() => setIsNatural(false)}
            aria-pressed={!isNatural}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition ${
              !isNatural
                ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {t("onboarding.enhanced")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("diet")} className="signup-field-label">
          {t("onboarding.diet")}
        </label>
        <select
          id={fid("diet")}
          value={dietaryPreference}
          onChange={(e) => setDietaryPreference(e.target.value as DietaryPreference)}
          className="signup-field-input"
        >
          {DIETARY_PREFERENCES.map((pref) => (
            <option key={pref} value={pref} className="bg-zinc-900">
              {dietLabel(pref)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("allergies")} className="signup-field-label">
          {t("onboarding.allergies")}
        </label>
        <textarea
          id={fid("allergies")}
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          rows={2}
          maxLength={500}
          className="signup-field-input resize-none"
          placeholder={t("signup.wizard.allergies_placeholder")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("disliked")} className="signup-field-label">
          {t("onboarding.disliked_foods")}
        </label>
        <textarea
          id={fid("disliked")}
          value={dislikedFoods}
          onChange={(e) => setDislikedFoods(e.target.value)}
          rows={2}
          maxLength={500}
          className="signup-field-input resize-none"
          placeholder={t("signup.wizard.disliked_foods_placeholder")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("health")} className="signup-field-label">
          {t("onboarding.health_conditions")}
        </label>
        <textarea
          id={fid("health")}
          value={healthConditions}
          onChange={(e) => setHealthConditions(e.target.value)}
          rows={2}
          maxLength={500}
          className="signup-field-input resize-none"
          placeholder={t("signup.wizard.health_conditions_placeholder")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("country")} className="signup-field-label">
          {t("onboarding.country")}
        </label>
        <select
          id={fid("country")}
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="signup-field-input"
          aria-invalid={attempted && fieldInvalid.countryCode ? true : undefined}
          aria-describedby={describe(
            attempted && fieldInvalid.countryCode && hintId,
            error && errorId,
          )}
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid("bio")} className="signup-field-label">
          {t("onboarding.bio")}
        </label>
        <textarea
          id={fid("bio")}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          maxLength={1000}
          className="signup-field-input resize-none"
          placeholder={t("onboarding.bio_placeholder")}
        />
      </div>

      {!valid && !submitting && (
        <p id={hintId} className="text-center text-[11px] text-zinc-500">
          {t("onboarding.validation.hint")}
        </p>
      )}

      {error && (
        <div id={errorId}>
          <InlineAlert
            message={error}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!valid || submitting}
        className="landing-btn landing-btn--primary mt-1 flex w-full items-center justify-center gap-2 disabled:opacity-40"
      >
        {submitting ? t("onboarding.submitting") : (submitLabel ?? t("onboarding.submit"))}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
