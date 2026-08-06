import { z } from "zod";
import { meetsMinimumAge } from "@/lib/compliance/age";
import { PRIMARY_GOALS } from "@/lib/validations/goals.schema";

export const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const ACTIVITY_LEVELS = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "athlete",
] as const;
export const DIETARY_PREFERENCES = [
  "omnivore",
  "vegetarian",
  "vegan",
  "pescatarian",
  "halal",
  "other",
] as const;

export type Gender = (typeof GENDERS)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

/** BCP-47-ish locale tag: language with optional region (e.g. "tr", "en-US"). */
export const localeSchema = z
  .string()
  .trim()
  .min(2, "Locale too short")
  .max(10, "Locale too long")
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/, "Invalid locale format")
  .transform((value) => value.toLowerCase());

const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid birth date")
  .refine(meetsMinimumAge, "You must be at least 16 years old");

const optionalNotes = z
  .string()
  .trim()
  .max(500, "Too long")
  .optional()
  .default("");

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(80, "Name too long"),
  gender: z.enum(GENDERS),
  birthDate: birthDateSchema,
  heightCm: z
    .number()
    .int("Height must be an integer")
    .min(50, "Height too low")
    .max(280, "Height too high"),
  weightKg: z
    .number()
    .min(20, "Weight too low")
    .max(500, "Weight too high"),
  experienceLevel: z.enum(EXPERIENCE_LEVELS),
  isNatural: z.boolean(),
  bio: z.string().trim().max(1000, "Bio too long").optional().default(""),
  locale: localeSchema,
  primaryGoal: z.enum(PRIMARY_GOALS),
  activityLevel: z.enum(ACTIVITY_LEVELS),
  trainingDaysPerWeek: z.number().int().min(0).max(7),
  dietaryPreference: z.enum(DIETARY_PREFERENCES),
  allergies: optionalNotes,
  dislikedFoods: optionalNotes,
  healthConditions: optionalNotes,
  countryCode: z
    .string()
    .trim()
    .length(2, "Country code must be 2 letters")
    .regex(/^[A-Za-z]{2}$/, "Invalid country code")
    .transform((value) => value.toUpperCase()),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
