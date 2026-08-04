import { ApiError } from "@/lib/api/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function hasVerifiedTotp(
  factors: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof createServerSupabaseClient>>["auth"]["mfa"]["listFactors"]
    >
  >["data"],
): boolean {
  return (factors?.totp ?? []).some((f) => f.status === "verified");
}

/**
 * When the user has enrolled TOTP, require AAL2 for API access.
 * Fail-closed if MFA state cannot be read.
 */
export async function requireMfaIfEnrolled(): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: factors, error: factorsError } =
    await supabase.auth.mfa.listFactors();
  if (factorsError) {
    throw new ApiError("FORBIDDEN", "MFA durumu doğrulanamadı.");
  }

  if (!hasVerifiedTotp(factors)) {
    return;
  }

  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || !aal) {
    throw new ApiError("FORBIDDEN", "MFA doğrulaması gerekli.");
  }

  if (aal.currentLevel !== "aal2" && aal.nextLevel === "aal2") {
    throw new ApiError(
      "FORBIDDEN",
      "Bu işlem için MFA doğrulaması gerekir.",
    );
  }
}

/**
 * Step-up auth for destructive / data-export actions (passwordless: MFA when enrolled).
 * `user` is accepted for call-site clarity; MFA is resolved from the session cookie.
 */
export async function requireSensitiveActionAuth(_user: {
  id: string;
}): Promise<void> {
  void _user;
  await requireMfaIfEnrolled();
}
