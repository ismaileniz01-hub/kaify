import { requireMfaIfEnrolled } from "@/lib/auth/mfa-server";
import { getServerAuthUser } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";

export type AuthedUser = {
  id: string;
  email: string | undefined;
};

export type RequireUserOptions = {
  /** Skip MFA AAL2 check (e.g. pre-MFA bootstrap — use sparingly). */
  skipMfa?: boolean;
};

/**
 * Resolves the authenticated user for the current request.
 * Throws ApiError(401) when there is no valid session.
 * Enrolled MFA users must be at AAL2 (fail-closed on MFA lookup errors).
 */
export async function requireUser(
  options?: RequireUserOptions,
): Promise<AuthedUser> {
  const user = await getServerAuthUser();

  if (!user) {
    throw new ApiError("UNAUTHORIZED", "Bu işlem için giriş yapmalısınız.");
  }

  if (!options?.skipMfa) {
    await requireMfaIfEnrolled(user);
  }

  return user;
}
