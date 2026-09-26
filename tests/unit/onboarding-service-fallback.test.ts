import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OnboardingInput } from "@/lib/validations/onboarding.schema";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));
vi.mock("@/lib/types/domain.types", () => ({
  mapProfileRow: vi.fn(() => ({ tier: null })),
}));
vi.mock("@/lib/auth/post-auth-redirect", () => ({
  hasPaidPlan: vi.fn(() => false),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import { completeOnboarding } from "@/lib/services/onboarding.service";

const INPUT: OnboardingInput = {
  displayName: "Test",
  gender: "male",
  birthDate: "1996-08-24",
  heightCm: 180,
  weightKg: 80,
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
  countryCode: "TR",
};

describe("completeOnboarding migration fallback", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("passes separate maintenance to the latest RPC", async () => {
    rpc.mockResolvedValueOnce({ data: { id: "user" }, error: null });

    await completeOnboarding(INPUT);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_maintenance_calorie_goal: expect.any(Number),
      p_calorie_goal: expect.any(Number),
      p_workouts_target: 3,
      p_equipment_access: "gym",
    });
  });

  it("falls back through both absent persistence migrations", async () => {
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST202", message: "maintenance signature missing" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST202", message: "equipment signature missing" },
      })
      .mockResolvedValueOnce({ data: { id: "user" }, error: null });

    await completeOnboarding(INPUT);

    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc.mock.calls[1][1]).not.toHaveProperty(
      "p_maintenance_calorie_goal",
    );
    expect(rpc.mock.calls[1][1]).toHaveProperty("p_equipment_access", "gym");
    expect(rpc.mock.calls[2][1]).not.toHaveProperty("p_equipment_access");
    expect(rpc.mock.calls[2][1]).not.toHaveProperty("p_calorie_goal");
  });
});
