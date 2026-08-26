import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { incrementTodayWorkout } from "@/lib/services/analytics.service";
import { featureFlags } from "@/lib/feature-flags";
import { localTodayDate } from "@/lib/date-utils";
import {
  nextPrescription,
  type SessionStatus,
  type SetPrescription,
} from "@/lib/training/progression";
import {
  isValidSwap,
  substitutesFor,
  templateBySlug,
  WORKOUT_TEMPLATES,
  type WorkoutTemplate,
} from "@/lib/training/templates";
import type { WorkoutPlanDTO, WorkoutPlanItemDTO } from "@/lib/training/plan-dto";

export type { WorkoutPlanDTO, WorkoutPlanItemDTO };

type PlanRow = {
  id: string;
  template_slug: string;
  title_key: string;
  place: "gym" | "home";
  version: number;
  status: WorkoutPlanDTO["status"];
};

type ItemRow = {
  day_index: number;
  sort_order: number;
  exercise_key: string;
  movement: SetPrescription["movement"];
  target_sets: number;
  target_reps: number;
  load_kg: number;
};

function adminClient(): SupabaseClient {
  return createAdminSupabaseClient() as unknown as SupabaseClient;
}

function isMissingRelation(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message ?? "";
  const code = error?.code ?? "";
  return /does not exist|42P01|PGRST205|schema cache|could not find the table/i.test(
    `${code} ${message}`,
  );
}

function emptyPlan(): WorkoutPlanDTO {
  return {
    id: "",
    templateSlug: "",
    titleKey: "workout.no_plan",
    place: "gym",
    version: 0,
    status: "paused",
    today: [],
    templates: WORKOUT_TEMPLATES.map((row) => ({
      slug: row.slug,
      titleKey: row.titleKey,
      place: row.place,
    })),
    available: false,
  };
}

function dayIndexForToday(dayCount: number, now = new Date()): number {
  if (dayCount <= 0) return 0;
  return now.getUTCDay() % dayCount;
}

export function listWorkoutTemplates(): WorkoutTemplate[] {
  return [...WORKOUT_TEMPLATES];
}

export async function getWorkoutPlan(userId: string): Promise<WorkoutPlanDTO | null> {
  if (!featureFlags.workoutPlans()) return null;
  const admin = adminClient();
  const { data: plan, error } = await admin
    .from("workout_plans")
    .select("id, template_slug, title_key, place, version, status")
    .eq("user_id", userId)
    .in("status", ["active", "deload"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && isMissingRelation(error)) return emptyPlan();
  if (error) throw new ApiError("INTERNAL_ERROR", "Workout plan could not be loaded.");
  if (!plan) {
    return { ...emptyPlan(), available: true };
  }
  const typed = plan as PlanRow;
  const { data: items, error: itemError } = await admin
    .from("workout_plan_items")
    .select("day_index, sort_order, exercise_key, movement, target_sets, target_reps, load_kg")
    .eq("plan_id", typed.id)
    .eq("plan_version", typed.version)
    .order("day_index")
    .order("sort_order");
  if (itemError && isMissingRelation(itemError)) return emptyPlan();
  if (itemError) throw new ApiError("INTERNAL_ERROR", "Workout plan items could not be loaded.");
  const template = templateBySlug(typed.template_slug);
  const dayCount = template?.days.length ?? 3;
  const todayIndex = dayIndexForToday(dayCount);
  const today = ((items ?? []) as ItemRow[])
    .filter((row) => row.day_index === todayIndex)
    .map((row) => ({
      dayIndex: row.day_index,
      sortOrder: row.sort_order,
      exerciseKey: row.exercise_key,
      movement: row.movement,
      targetSets: row.target_sets,
      targetReps: row.target_reps,
      loadKg: Number(row.load_kg),
      labelKey: template?.days[row.day_index]?.labelKey ?? "workout.day.push",
      substitutes: substitutesFor(row.exercise_key),
    }));
  return {
    id: typed.id,
    templateSlug: typed.template_slug,
    titleKey: typed.title_key,
    place: typed.place,
    version: typed.version,
    status: typed.status,
    today,
    templates: WORKOUT_TEMPLATES.map((row) => ({
      slug: row.slug,
      titleKey: row.titleKey,
      place: row.place,
    })),
    available: true,
  };
}

export async function applyWorkoutTemplate(
  userId: string,
  slug: string,
): Promise<WorkoutPlanDTO> {
  const template = templateBySlug(slug);
  if (!template) throw new ApiError("VALIDATION_ERROR", "Unknown workout template.");
  const admin = adminClient();
  const { error: completeError } = await admin
    .from("workout_plans")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("status", ["active", "deload", "paused"]);
  if (completeError && isMissingRelation(completeError)) {
    throw new ApiError("INTERNAL_ERROR", "Workout plan tables are not applied yet.");
  }
  if (completeError) {
    throw new ApiError("INTERNAL_ERROR", "Workout plan could not be saved.");
  }

  const { data: plan, error } = await admin
    .from("workout_plans")
    .insert({
      user_id: userId,
      template_slug: template.slug,
      title_key: template.titleKey,
      place: template.place,
      version: 1,
      status: "active",
    })
    .select("id, template_slug, title_key, place, version, status")
    .single();
  if (error && isMissingRelation(error)) {
    throw new ApiError("INTERNAL_ERROR", "Workout plan tables are not applied yet.");
  }
  if (error || !plan) {
    throw new ApiError("INTERNAL_ERROR", "Workout plan could not be saved.");
  }

  const rows = template.days.flatMap((day) =>
    day.exercises.map((exercise, sortOrder) => ({
      user_id: userId,
      plan_id: plan.id,
      plan_version: 1,
      day_index: day.dayIndex,
      sort_order: sortOrder,
      exercise_key: exercise.exerciseKey,
      movement: exercise.movement,
      target_sets: exercise.targetSets,
      target_reps: exercise.targetReps,
      load_kg: exercise.loadKg,
    })),
  );
  const { error: itemError } = await admin.from("workout_plan_items").insert(rows);
  if (itemError) {
    throw new ApiError("INTERNAL_ERROR", "Workout plan items could not be saved.");
  }
  const next = await getWorkoutPlan(userId);
  if (!next?.id) throw new ApiError("INTERNAL_ERROR", "Workout plan could not be loaded.");
  return next;
}

export async function swapPlanExercise(
  userId: string,
  fromKey: string,
  toKey: string,
): Promise<WorkoutPlanDTO> {
  if (!isValidSwap(fromKey, toKey)) {
    throw new ApiError("VALIDATION_ERROR", "Swap must stay in the same muscle group.");
  }
  const plan = await getWorkoutPlan(userId);
  if (!plan?.id) throw new ApiError("NOT_FOUND", "No active workout plan.");
  const admin = adminClient();
  const { error } = await admin
    .from("workout_plan_items")
    .update({ exercise_key: toKey })
    .eq("user_id", userId)
    .eq("plan_id", plan.id)
    .eq("plan_version", plan.version)
    .eq("exercise_key", fromKey);
  if (error && isMissingRelation(error)) {
    throw new ApiError("INTERNAL_ERROR", "Workout plan tables are not applied yet.");
  }
  if (error) throw new ApiError("INTERNAL_ERROR", "Exercise swap failed.");
  const next = await getWorkoutPlan(userId);
  if (!next) throw new ApiError("INTERNAL_ERROR", "Workout plan could not be loaded.");
  return next;
}

export async function logWorkoutSession(input: {
  userId: string;
  status: SessionStatus;
  timezone?: string | null;
  sets?: Array<{ exerciseKey: string; reps: number; loadKg: number; rir?: number | null }>;
}): Promise<{ ok: true; workoutsCompleted?: number }> {
  const sessionDate = localTodayDate(input.timezone ?? "UTC");
  const incrementIfCompleted = async () => {
    if (input.status !== "completed") return { ok: true as const };
    const workoutsCompleted = await incrementTodayWorkout(input.userId);
    return { ok: true as const, workoutsCompleted };
  };

  if (!featureFlags.workoutPlans()) {
    return incrementIfCompleted();
  }

  let plan: WorkoutPlanDTO | null = null;
  try {
    plan = await getWorkoutPlan(input.userId);
  } catch {
    return incrementIfCompleted();
  }
  if (plan && !plan.available) {
    return incrementIfCompleted();
  }

  const admin = adminClient();
  const { data: session, error } = await admin
    .from("workout_sessions")
    .upsert(
      {
        user_id: input.userId,
        plan_id: plan?.id || null,
        plan_version: plan?.version || null,
        session_date: sessionDate,
        status: input.status,
      },
      { onConflict: "user_id,session_date,status" },
    )
    .select("id")
    .single();
  if (error && isMissingRelation(error)) {
    return incrementIfCompleted();
  }
  if (error || !session) {
    throw new ApiError("INTERNAL_ERROR", "Workout session could not be saved.");
  }

  if (input.status === "completed" && input.sets && input.sets.length > 0) {
    const { data: lastSet } = await admin
      .from("workout_set_logs")
      .select("set_index")
      .eq("session_id", session.id)
      .order("set_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    const startIndex = Number(lastSet?.set_index ?? 0);
    const { error: logError } = await admin.from("workout_set_logs").insert(
      input.sets.map((row, index) => ({
        user_id: input.userId,
        session_id: session.id,
        exercise_key: row.exerciseKey,
        set_index: Math.min(8, startIndex + index + 1),
        reps: row.reps,
        load_kg: row.loadKg,
        rir: row.rir ?? null,
      })),
    );
    if (logError && !isMissingRelation(logError)) {
      throw new ApiError("INTERNAL_ERROR", "Set log could not be saved.");
    }
  }

  if (plan?.id && plan.today.length > 0) {
    const progressed = plan.today.map((item) =>
      nextPrescription(
        {
          exerciseKey: item.exerciseKey,
          movement: item.movement,
          targetSets: item.targetSets,
          targetReps: item.targetReps,
          loadKg: item.loadKg,
        },
        {
          status: input.status,
          logged: input.sets,
        },
      ),
    );
    for (const next of progressed) {
      await admin
        .from("workout_plan_items")
        .update({
          target_sets: next.targetSets,
          target_reps: next.targetReps,
          load_kg: next.loadKg,
        })
        .eq("plan_id", plan.id)
        .eq("plan_version", plan.version)
        .eq("exercise_key", next.exerciseKey);
    }
    if (input.status === "deload") {
      await admin
        .from("workout_plans")
        .update({ status: "deload", updated_at: new Date().toISOString() })
        .eq("id", plan.id);
    } else if (plan.status === "deload" && input.status === "completed") {
      await admin
        .from("workout_plans")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", plan.id);
    }
  }

  return incrementIfCompleted();
}
