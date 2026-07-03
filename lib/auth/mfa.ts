/**
 * MFA (TOTP) helpers — client-side Supabase MFA API wrappers.
 *
 * Magic-link login gives AAL1. Users who enroll TOTP must verify to reach AAL2
 * before accessing protected routes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export type MfaAssurance = {
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
  /** True when the user has enrolled MFA but has not verified this session. */
  verificationRequired: boolean;
};

function parseAal(value: unknown): "aal1" | "aal2" | null {
  return value === "aal1" || value === "aal2" ? value : null;
}

export async function getMfaAssurance(
  supabase: SupabaseClient<Database>,
): Promise<MfaAssurance> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) {
    return {
      currentLevel: null,
      nextLevel: null,
      verificationRequired: false,
    };
  }

  const currentLevel = parseAal(data.currentLevel);
  const nextLevel = parseAal(data.nextLevel);

  const verificationRequired = currentLevel === "aal1" && nextLevel === "aal2";

  return {
    currentLevel,
    nextLevel,
    verificationRequired,
  };
}

export async function listVerifiedTotpFactors(
  supabase: SupabaseClient<Database>,
): Promise<{ id: string; friendlyName: string | null }[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];

  return (data.totp ?? [])
    .filter((f) => f.status === "verified")
    .map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null }));
}

export async function enrollTotp(
  supabase: SupabaseClient<Database>,
  friendlyName = "Authenticator",
) {
  return supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
}

export async function verifyTotpEnrollment(
  supabase: SupabaseClient<Database>,
  factorId: string,
  code: string,
) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) {
    return { error: challengeError ?? new Error("Challenge failed") };
  }

  return supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
}

export async function verifyTotpLogin(
  supabase: SupabaseClient<Database>,
  factorId: string,
  code: string,
) {
  return verifyTotpEnrollment(supabase, factorId, code);
}

export async function unenrollTotp(
  supabase: SupabaseClient<Database>,
  factorId: string,
) {
  return supabase.auth.mfa.unenroll({ factorId });
}
