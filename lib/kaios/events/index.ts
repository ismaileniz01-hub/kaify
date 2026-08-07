/**
 * Minimal Event Engine stub — routine product events update state without LLM.
 * Full aggregation for Council weekly snapshots can expand here.
 */

export type KaiosEventCategory =
  | "training"
  | "nutrition"
  | "hydration"
  | "physique"
  | "motivation"
  | "council"
  | "system";

export type KaiosEvent = {
  id?: string;
  category: KaiosEventCategory;
  type: string;
  userId: string;
  payload: Record<string, unknown>;
  at: string;
};

/** Deterministic handlers — never call the model from here. */
export function applyKaiosEvent(_event: KaiosEvent): {
  statePatches: Record<string, unknown>;
  needsAi: false;
} {
  return { statePatches: {}, needsAi: false };
}

/**
 * Aggregate many routine events into a compact weekly snapshot fragment.
 */
export function aggregateWeeklyTraining(events: KaiosEvent[]): string {
  const workouts = events.filter((e) => e.type === "workout_completed");
  if (workouts.length === 0) return "training_7d: none";
  return `training_7d: sessions=${workouts.length}`;
}
