export type MovementClass = "upper" | "lower" | "core";
export type SessionStatus = "completed" | "missed" | "rest" | "deload";

export const UPPER_INCREMENT_KG = 2.5;
export const LOWER_INCREMENT_KG = 5;
export const CORE_INCREMENT_KG = 0;
export const MAX_LOAD_JUMP_RATIO = 0.1;
export const DELOAD_LOAD_RATIO = 0.6;
export const MISSED_VOLUME_RATIO = 0.8;

export type SetPrescription = {
  exerciseKey: string;
  movement: MovementClass;
  targetSets: number;
  targetReps: number;
  loadKg: number;
};

export type LoggedSet = {
  exerciseKey: string;
  reps: number;
  loadKg: number;
};

export function incrementForMovement(movement: MovementClass): number {
  if (movement === "upper") return UPPER_INCREMENT_KG;
  if (movement === "lower") return LOWER_INCREMENT_KG;
  return CORE_INCREMENT_KG;
}

export function clampLoadJump(previousKg: number, proposedKg: number): number {
  if (previousKg <= 0) return Math.max(0, proposedKg);
  const max = previousKg * (1 + MAX_LOAD_JUMP_RATIO);
  return roundLoad(Math.min(proposedKg, max));
}

export function isUnsafeLoadJump(previousKg: number, nextKg: number): boolean {
  if (previousKg <= 0) return false;
  return nextKg > previousKg * (1 + MAX_LOAD_JUMP_RATIO) + 0.01;
}

export function allSetsHitTarget(
  logged: LoggedSet[],
  prescription: SetPrescription,
): boolean {
  const rows = logged.filter((row) => row.exerciseKey === prescription.exerciseKey);
  if (rows.length < prescription.targetSets) return false;
  return rows
    .slice(0, prescription.targetSets)
    .every((row) => row.reps >= prescription.targetReps);
}

export function nextPrescription(
  current: SetPrescription,
  input: {
    status: SessionStatus;
    logged?: LoggedSet[];
  },
): SetPrescription {
  if (input.status === "rest") return { ...current };
  if (input.status === "deload") {
    return {
      ...current,
      loadKg: roundLoad(current.loadKg * DELOAD_LOAD_RATIO),
    };
  }
  if (input.status === "missed") {
    return {
      ...current,
      targetSets: Math.max(1, Math.round(current.targetSets * MISSED_VOLUME_RATIO)),
    };
  }

  const hit = allSetsHitTarget(input.logged ?? [], current);
  if (!hit) return { ...current };
  const proposed = current.loadKg + incrementForMovement(current.movement);
  return {
    ...current,
    loadKg: roundLoad(clampLoadJump(current.loadKg, proposed)),
  };
}

export function roundLoad(value: number): number {
  return Math.round(Math.max(0, value) * 4) / 4;
}
