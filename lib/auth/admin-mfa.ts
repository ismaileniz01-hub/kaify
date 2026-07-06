import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

/**
 * Admin accounts must enroll TOTP and complete AAL2 before any admin action.
 */
export async function assertAdminMfa(supabase: SupabaseClient): Promise<void> {
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

  if (factorsError) {
    logger.error("[admin-mfa] listFactors failed", { error: factorsError.message });
    throw new ApiError(
      "FORBIDDEN",
      "Yönetici işlemleri için MFA kaydı gerekir.",
    );
  }

  const hasVerifiedTotp = (factors?.totp ?? []).some((f) => f.status === "verified");
  if (!hasVerifiedTotp) {
    throw new ApiError(
      "FORBIDDEN",
      "Yönetici hesapları için MFA (TOTP) kaydı zorunludur.",
    );
  }

  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    logger.error("[admin-mfa] AAL lookup failed", { error: aalError.message });
    throw new ApiError(
      "FORBIDDEN",
      "Yönetici işlemleri için MFA doğrulaması gerekir.",
    );
  }

  if (aal?.currentLevel !== "aal2") {
    throw new ApiError(
      "FORBIDDEN",
      "Yönetici işlemleri için MFA doğrulaması gerekir.",
    );
  }
}
