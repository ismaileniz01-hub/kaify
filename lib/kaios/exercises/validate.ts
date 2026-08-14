/**
 * Validate that exercise ids exist in the KAIOS catalog.
 */

import { getExerciseById } from "@/lib/kaios/exercises/catalog";

export type AssertExerciseIdsResult = {
  valid: string[];
  invalid: string[];
};

/**
 * Split ids into valid / invalid against the catalog.
 * Duplicate inputs are checked independently (listed once in each bucket).
 */
export function assertExerciseIdsExist(ids: string[]): AssertExerciseIdsResult {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seenValid = new Set<string>();
  const seenInvalid = new Set<string>();

  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id) {
      if (!seenInvalid.has("")) {
        seenInvalid.add("");
        invalid.push("");
      }
      continue;
    }
    if (getExerciseById(id)) {
      if (!seenValid.has(id)) {
        seenValid.add(id);
        valid.push(id);
      }
    } else if (!seenInvalid.has(id)) {
      seenInvalid.add(id);
      invalid.push(id);
    }
  }

  return { valid, invalid };
}
