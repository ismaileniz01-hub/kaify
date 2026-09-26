import { describe, expect, it } from "vitest";
import { onboardingSchema } from "@/lib/validations/onboarding.schema";

const validInput = {
  displayName: "Test User",
  gender: "prefer_not_to_say",
  birthDate: "2000-01-01",
  heightCm: 175,
  weightKg: 70,
  experienceLevel: "beginner",
  isNatural: true,
  bio: "",
  locale: "en",
  primaryGoal: "stay_fit",
  activityLevel: "moderately_active",
  trainingDaysPerWeek: 3,
  equipmentAccess: "gym",
  dietaryPreference: "omnivore",
  allergies: "",
  dislikedFoods: "",
  healthConditions: "",
  countryCode: "US",
};

describe("onboarding schema equipment access", () => {
  it.each(["home", "gym", "limited"] as const)("accepts %s", (equipmentAccess) => {
    expect(
      onboardingSchema.safeParse({ ...validInput, equipmentAccess }).success,
    ).toBe(true);
  });

  it("rejects missing or unknown equipment access", () => {
    const missing = { ...validInput, equipmentAccess: undefined };
    expect(onboardingSchema.safeParse(missing).success).toBe(false);
    expect(
      onboardingSchema.safeParse({
        ...validInput,
        equipmentAccess: "commercial",
      }).success,
    ).toBe(false);
  });
});
