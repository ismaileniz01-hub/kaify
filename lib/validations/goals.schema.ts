import { z } from "zod";

export const PRIMARY_GOALS = [
  "lose_weight",
  "build_muscle",
  "stay_fit",
  "endurance",
] as const;

export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const goalsPatchSchema = z
  .object({
    primaryGoal: z.enum(PRIMARY_GOALS).optional(),
    calorieGoal: z.number().int().min(800).max(6000).optional(),
    workoutsTarget: z.number().int().min(1).max(14).optional(),
    waterGoalLiters: z.number().min(0.5).max(10).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.primaryGoal !== undefined ||
      value.calorieGoal !== undefined ||
      value.workoutsTarget !== undefined ||
      value.waterGoalLiters !== undefined,
    { message: "At least one goal field is required" },
  );

export type GoalsPatchInput = z.infer<typeof goalsPatchSchema>;
