/**
 * Canonical safety state extraction — must survive casual tier pruning.
 */

const SAFETY_LINE_RE =
  /\b(allerg(?:y|ies)|injur(?:y|ies)|limitation|contraindicat|health.?constraint|dietary.?restrict|sakatl[iı]k|alerji)\b/i;

export function splitSafetyAndGeneralState(userState?: string): {
  safetyState?: string;
  generalState?: string;
} {
  if (!userState?.trim()) return {};
  const parts = userState
    .split(/;\s*|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const safety: string[] = [];
  const general: string[] = [];
  for (const part of parts) {
    if (SAFETY_LINE_RE.test(part)) safety.push(part);
    else general.push(part);
  }
  return {
    safetyState: safety.length ? safety.join("; ") : undefined,
    generalState: general.length ? general.join("; ") : undefined,
  };
}

export function hasCanonicalSafetyState(userState?: string): boolean {
  return Boolean(splitSafetyAndGeneralState(userState).safetyState);
}
