import { applyLegacyProfileWrites } from "@/lib/supabase/profile-compat";

/**
 * K-011: production's profiles shape is unknown. A legacy production DB has
 * full_name / subscription_tier / height / weight / experience next to the
 * canonical columns; a DB built only from supabase/migrations does not.
 *
 * Writes try the dual (canonical + legacy mirror) payload first. If — and only
 * if — the database rejects it because a LEGACY column does not exist
 * (Postgres 42703 / PostgREST PGRST204 naming that column), the same write is
 * repeated with the canonical columns only. Any other error is returned
 * untouched to the caller.
 */
export const LEGACY_PROFILE_COLUMNS = [
  "full_name",
  "subscription_tier",
  "height",
  "weight",
  "experience",
] as const;

type WriteError = { code?: string | null; message?: string | null } | null | undefined;

export function isMissingLegacyProfileColumnError(error: WriteError): boolean {
  if (!error) return false;
  if (error.code !== "42703" && error.code !== "PGRST204") return false;
  const message = error.message ?? "";
  // 42703: column "full_name" of relation "profiles" does not exist
  // PGRST204: Could not find the 'full_name' column of 'profiles' in the schema cache
  return LEGACY_PROFILE_COLUMNS.some(
    (column) => message.includes(`"${column}"`) || message.includes(`'${column}'`),
  );
}

export function withoutLegacyProfileColumns(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const canonical = { ...payload };
  for (const column of LEGACY_PROFILE_COLUMNS) delete canonical[column];
  return canonical;
}

export async function writeProfileWithLegacyMirror<R extends { error: WriteError }>(
  canonical: Record<string, unknown>,
  write: (payload: Record<string, unknown>) => PromiseLike<R>,
): Promise<R> {
  const dual = applyLegacyProfileWrites({ ...canonical });
  const hasLegacy = LEGACY_PROFILE_COLUMNS.some((column) => column in dual);
  if (!hasLegacy) return write(dual);

  const first = await write(dual);
  if (!isMissingLegacyProfileColumnError(first.error)) return first;
  return write(withoutLegacyProfileColumns(dual));
}
