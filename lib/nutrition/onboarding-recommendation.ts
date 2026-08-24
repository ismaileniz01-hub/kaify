import type {
  ActivityLevel,
  Gender,
} from "@/lib/validations/onboarding.schema";
import type { PrimaryGoal } from "@/lib/validations/goals.schema";

export type OnboardingNutritionInput = {
  gender: Gender;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  trainingDaysPerWeek: number;
  primaryGoal: PrimaryGoal;
};

export type OnboardingNutritionRecommendation = {
  calorieTarget: number;
  workoutsTarget: number;
};

/**
 * Mifflin-St Jeor constants (kcal/day):
 * BMR = 10W(kg) + 6.25H(cm) - 5A(years) + sex term.
 *
 * The neutral term is the midpoint of the published male (+5) and female
 * (-161) terms. It avoids inferring sex physiology for "other" and
 * "prefer_not_to_say" while preserving the controlled male/female ordering.
 */
const MIFFLIN_SEX_TERM: Record<Gender, number> = {
  male: 5,
  female: -161,
  other: -78,
  prefer_not_to_say: -78,
};

/**
 * These are deliberately narrower than common all-in activity multipliers.
 * They model non-training lifestyle only; planned training is added separately
 * below so exercise is not counted twice.
 */
const LIFESTYLE_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.28,
  moderately_active: 1.36,
  very_active: 1.44,
  athlete: 1.52,
};

/**
 * Each planned training day adds 2.5% of BMR to average daily expenditure.
 * At seven days this is +17.5%, keeping the combined range conservative while
 * making every training-day increase monotonic.
 */
const TRAINING_DAY_BMR_FRACTION = 0.025;

/** Goal adjustments are conservative percentages applied after TDEE. */
const GOAL_MULTIPLIER: Record<PrimaryGoal, number> = {
  lose_weight: 0.85,
  build_muscle: 1.1,
  recomposition: 0.95,
  stay_fit: 1,
  endurance: 1.05,
};

export const ONBOARDING_CALORIE_MIN = 800;
export const ONBOARDING_CALORIE_MAX = 6000;

function ageOnDate(birthDate: string, asOfDate: Date): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = asOfDate.getUTCFullYear() - year;
  const beforeBirthday =
    asOfDate.getUTCMonth() + 1 < month ||
    (asOfDate.getUTCMonth() + 1 === month && asOfDate.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Pure recommendation calculation. Requiring `asOfDate` keeps age-dependent
 * output deterministic; callers normally provide today's date.
 */
export function recommendOnboardingNutrition(
  input: OnboardingNutritionInput,
  asOfDate: Date,
): OnboardingNutritionRecommendation {
  const age = ageOnDate(input.birthDate, asOfDate);
  const bmr =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * age +
    MIFFLIN_SEX_TERM[input.gender];
  const tdee =
    bmr *
    (LIFESTYLE_MULTIPLIER[input.activityLevel] +
      input.trainingDaysPerWeek * TRAINING_DAY_BMR_FRACTION);
  const adjusted = Math.round(tdee * GOAL_MULTIPLIER[input.primaryGoal]);

  return {
    calorieTarget: Math.min(
      ONBOARDING_CALORIE_MAX,
      Math.max(ONBOARDING_CALORIE_MIN, adjusted),
    ),
    // Existing goals API requires at least one; zero training days maps to a
    // sensible weekly movement/check-in target without changing that contract.
    workoutsTarget: Math.max(1, input.trainingDaysPerWeek),
  };
}
