/**
 * Canonical safety state extraction — must survive casual tier pruning.
 */

const SAFETY_LINE_RE =
  /\b(allerg(?:y|ies)|injur(?:y|ies)|limitation|contraindicat|health.?constraint|dietary.?restrict|sakatl[iı]k|alerji)\b/i;

/** Product facts coaches must keep even on casual greetings (tier 0). */
const STICKY_LINE_RE =
  /\b(primary_goal|experience_level|training_days_per_week|activity_level|dietary_preference|calorie_goal|protein_goal_g|carbs_goal_g|fat_goal_g|leo_lagging|leo_overall|leo_priority|leo_scores|alex_last_plan)\b/i;

export function splitSafetyAndGeneralState(userState?: string): {
  safetyState?: string;
  stickyState?: string;
  generalState?: string;
} {
  if (!userState?.trim()) return {};
  const parts = userState
    .split(/;\s*|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const safety: string[] = [];
  const sticky: string[] = [];
  const general: string[] = [];
  for (const part of parts) {
    if (SAFETY_LINE_RE.test(part)) safety.push(part);
    else if (STICKY_LINE_RE.test(part)) sticky.push(part);
    else general.push(part);
  }
  return {
    safetyState: safety.length ? safety.join("; ") : undefined,
    stickyState: sticky.length ? sticky.join("; ") : undefined,
    generalState: general.length ? general.join("; ") : undefined,
  };
}

export function hasCanonicalSafetyState(userState?: string): boolean {
  return Boolean(splitSafetyAndGeneralState(userState).safetyState);
}
