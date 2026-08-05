import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { logger } from "@/lib/logger";
import { saveUserGoals } from "@/lib/services/analytics.service";
import { upsertUserSettings } from "@/lib/services/settings.service";
import {
  goalsPatchSchema,
  type PrimaryGoal,
} from "@/lib/validations/goals.schema";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/analytics/goals
 * Saves user-authored targets + optional primary goal, marking goals configured.
 */
export const PATCH = defineRoute(
  { route: "PATCH /api/analytics/goals", requireCsrf: true },
  async ({ user, request }) => {
    const raw = await request.json().catch(() => null);
    const parsed = goalsPatchSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz hedef.",
        parsed.error.issues,
      );
    }

    const { primaryGoal, calorieGoal, workoutsTarget, waterGoalLiters } =
      parsed.data;

    const today = await saveUserGoals(user.id, {
      calorieGoal,
      workoutsTarget,
      waterGoalLiters,
    });

    let primary: PrimaryGoal | null = primaryGoal ?? null;
    let configured = true;
    try {
      const settings = await upsertUserSettings(user.id, {
        ...(primaryGoal !== undefined ? { primaryGoal } : {}),
        goalsConfigured: true,
      });
      primary = settings.primaryGoal;
      configured = settings.goalsConfigured;
    } catch (error) {
      // Migration 20260805140000 may not be applied yet — analytics targets
      // still persist; primary_goal / goals_configured need the new columns.
      logger.warn("[analytics/goals] settings upsert skipped", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    return {
      today,
      primaryGoal: primary,
      goalsConfigured: configured,
    };
  },
);
