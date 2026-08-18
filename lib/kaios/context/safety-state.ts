/**
 * Canonical safety state extraction — must survive casual tier pruning.
 */

const SAFETY_LINE_RE =
  /\b(allerg(?:y|ies)|injur(?:y|ies)|limitation|contraindicat|health.?constraint|dietary.?restrict|sakatl[iı]k|alerji)\b/i;

/** Product facts coaches must keep even on casual greetings (tier 0). */
const STICKY_LINE_RE =
  /\b(primary_goal|experience_level|training_days_per_week|activity_level|dietary_preference|disliked_foods|user_gender|familiarity_stage|calorie_goal|protein_goal_g|carbs_goal_g|fat_goal_g|calories_today|protein_today_g|leo_lagging|leo_overall|leo_priority|leo_scores|alex_last_plan)\b/i;

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

/**
 * Keep safety + onboarding/teammate facts when USER_CONTEXT is over budget.
 * Truncate general fitness prose last so leo_lagging / calorie_goal survive.
 */
export function prioritizeTrustedUserState(
  userState: string,
  maxChars: number,
): string {
  const trimmed = userState.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxChars) return trimmed;
  const { safetyState, stickyState, generalState } =
    splitSafetyAndGeneralState(trimmed);
  const essential = [safetyState, stickyState].filter(Boolean).join("; ");
  if (!essential) return `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
  if (essential.length >= maxChars) {
    return `${essential.slice(0, Math.max(0, maxChars - 1))}…`;
  }
  if (!generalState) return essential;
  const room = maxChars - essential.length - 2;
  if (room <= 1) return essential;
  const general =
    generalState.length <= room
      ? generalState
      : `${generalState.slice(0, room - 1)}…`;
  return `${essential}; ${general}`;
}
