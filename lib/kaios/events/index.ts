/**
 * KAIOS Event Engine — deterministic product-event handling (no LLM).
 * Events describe what changed; memory/context consumers decide relevance.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Json } from "@/lib/types/database.types";

export type KaiosEventCategory =
  | "training"
  | "nutrition"
  | "hydration"
  | "physique"
  | "motivation"
  | "council"
  | "system"
  | "memory";

export type KaiosEvent = {
  id?: string;
  category: KaiosEventCategory;
  type: string;
  userId: string;
  payload: Record<string, unknown>;
  at: string;
};

export type KaiosEventResult = {
  statePatches: Record<string, unknown>;
  memoryHints: string[];
  needsAi: false;
};

/** In-process recent event buffer for tests / short-lived aggregation (not durable). */
const recentByUser = new Map<string, KaiosEvent[]>();
const MAX_RECENT = 40;

function pushRecent(event: KaiosEvent): void {
  const list = recentByUser.get(event.userId) ?? [];
  list.push(event);
  while (list.length > MAX_RECENT) list.shift();
  recentByUser.set(event.userId, list);
}

export function getRecentKaiosEvents(userId: string): KaiosEvent[] {
  return [...(recentByUser.get(userId) ?? [])];
}

export function clearRecentKaiosEvents(userId?: string): void {
  if (userId) recentByUser.delete(userId);
  else recentByUser.clear();
}

/** Deterministic handlers — never call the model from here. */
export function applyKaiosEvent(event: KaiosEvent): KaiosEventResult {
  const statePatches: Record<string, unknown> = {};
  const memoryHints: string[] = [];

  switch (event.type) {
    case "meal_saved": {
      const meal = event.payload.meal as
        | { calories?: number; protein?: number; carbs?: number; fat?: number }
        | undefined;
      if (meal) {
        statePatches.last_meal_macros = meal;
        memoryHints.push(
          `meal_saved:${Math.round(meal.calories ?? 0)}kcal_P${Math.round(meal.protein ?? 0)}`,
        );
      }
      break;
    }
    case "hydration_recorded": {
      statePatches.last_water_liters = event.payload.liters;
      memoryHints.push(`hydration:${event.payload.liters}L`);
      break;
    }
    case "workout_completed": {
      statePatches.last_workout = event.payload.summary ?? true;
      memoryHints.push("workout_completed");
      break;
    }
    case "physique_scored": {
      statePatches.last_leo_overall = event.payload.overall_score;
      if (event.payload.priority) {
        statePatches.leo_priority = event.payload.priority;
        memoryHints.push(`leo_priority:${String(event.payload.priority)}`);
      }
      break;
    }
    case "council_decision": {
      statePatches.last_council_decision = event.payload.decision;
      memoryHints.push(
        `council_decision:${JSON.stringify(event.payload.decision).slice(0, 200)}`,
      );
      break;
    }
    case "meal_confirmation_expired":
    case "meal_confirmation_rejected":
      memoryHints.push(event.type);
      break;
    default:
      break;
  }

  return { statePatches, memoryHints, needsAi: false };
}

/**
 * Persist compact structured memory hints from events (no LLM).
 * Failures are logged and never block the product write path.
 */
function asJsonObject(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

async function persistEventStatePatches(
  userId: string,
  patches: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(patches).length === 0) return;
  try {
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from("user_coaching_state")
      .select("nutrition_prefs, posture_flags, training_focus")
      .eq("user_id", userId)
      .maybeSingle();

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patches.last_workout !== undefined) {
      const summary =
        typeof patches.last_workout === "string"
          ? patches.last_workout
          : "workout_completed";
      update.last_workout_summary = summary.slice(0, 240);
    }
    if (patches.last_meal_macros !== undefined || patches.last_water_liters !== undefined) {
      const prefs = asJsonObject(data?.nutrition_prefs ?? null);
      if (patches.last_meal_macros !== undefined) {
        prefs.last_meal_macros = patches.last_meal_macros;
      }
      if (patches.last_water_liters !== undefined) {
        prefs.last_water_liters = patches.last_water_liters;
      }
      update.nutrition_prefs = prefs as Json;
    }
    if (patches.last_leo_overall !== undefined) {
      const flags = asJsonObject(data?.posture_flags ?? null);
      flags.last_leo_overall = patches.last_leo_overall;
      if (patches.leo_priority !== undefined) flags.leo_priority = patches.leo_priority;
      update.posture_flags = flags as Json;
    }
    if (typeof patches.leo_priority === "string" && patches.leo_priority.trim()) {
      const focus = Array.isArray(data?.training_focus) ? [...data.training_focus] : [];
      update.training_focus = [
        patches.leo_priority,
        ...focus.filter((item) => item !== patches.leo_priority),
      ].slice(0, 4);
    }
    if (Object.keys(update).length <= 1) return;

    if (data) {
      await admin.from("user_coaching_state").update(update).eq("user_id", userId);
    } else {
      await admin.from("user_coaching_state").insert({
        user_id: userId,
        ...update,
      });
    }
  } catch (error) {
    logger.warn("kaios.event.state_persist_failed", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

async function persistEventMemoryHints(
  userId: string,
  hints: string[],
): Promise<void> {
  if (hints.length === 0) return;
  // Skip transient reject/expire noise for long-term memory.
  const durable = hints.filter(
    (h) =>
      !h.startsWith("meal_confirmation_expired") &&
      !h.startsWith("meal_confirmation_rejected"),
  );
  if (durable.length === 0) return;

  try {
    const admin = createAdminSupabaseClient();
    const summary = durable.map((h) => `- ${h}`).join("\n");
    await admin.from("coaching_memory").insert({
      user_id: userId,
      coach_id: null,
      summary: `KAIOS event facts:\n${summary}`,
    });
  } catch (error) {
    logger.warn("kaios.event.memory_persist_failed", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Emit + apply a structured event. Prefer {@link emitKaiosEventBestEffort}
 * after canonical product writes so event/memory failures never undo or
 * misreport durable state.
 */
export async function emitKaiosEvent(event: KaiosEvent): Promise<KaiosEventResult> {
  pushRecent(event);
  const result = applyKaiosEvent(event);
  logger.info("kaios.event", {
    userId: event.userId,
    category: event.category,
    type: event.type,
    memoryHints: result.memoryHints.length,
  });
  void persistEventMemoryHints(event.userId, result.memoryHints);
  void persistEventStatePatches(event.userId, result.statePatches);
  return result;
}

/**
 * Post-write emission: never throws. Canonical DB state is the source of truth;
 * the in-process buffer and memory hints are reliability/enhancement only.
 */
export async function emitKaiosEventBestEffort(
  event: KaiosEvent,
): Promise<KaiosEventResult | null> {
  try {
    return await emitKaiosEvent(event);
  } catch (error) {
    logger.warn("kaios.event.emit_best_effort_failed", {
      userId: event.userId,
      type: event.type,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/**
 * Aggregate many routine events into a compact weekly snapshot fragment.
 */
export function aggregateWeeklyTraining(events: KaiosEvent[]): string {
  const workouts = events.filter((e) => e.type === "workout_completed");
  if (workouts.length === 0) return "training_7d: none";
  return `training_7d: sessions=${workouts.length}`;
}

export function aggregateWeeklyNutrition(events: KaiosEvent[]): string {
  const meals = events.filter((e) => e.type === "meal_saved");
  if (meals.length === 0) return "nutrition_7d: none";
  return `nutrition_7d: meals_saved=${meals.length}`;
}
