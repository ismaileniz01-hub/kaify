import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import {
  type ConsentType,
  CONSENT_TYPES,
  consentPolicyVersion,
} from "@/lib/legal/constants";

export type ConsentRecordInput = {
  userId: string;
  consentType: ConsentType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export type ConsentStatus = {
  termsPrivacy: boolean;
  aiHealth: boolean;
  photoAnalysis: boolean;
  pushNotifications: boolean;
};

const REVOKABLE_TYPES: ConsentType[] = [
  CONSENT_TYPES.AI_HEALTH,
  CONSENT_TYPES.PHOTO_ANALYSIS,
  CONSENT_TYPES.PUSH_NOTIFICATIONS,
];

export function isRevocableConsentType(type: ConsentType): boolean {
  return REVOKABLE_TYPES.includes(type);
}

/** Records an explicit consent event (service-role insert). */
export async function recordConsent(input: ConsentRecordInput): Promise<void> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;
  const policyVersion = consentPolicyVersion(input.consentType);

  const { error } = await db.from("consent_records").insert({
    user_id: input.userId,
    consent_type: input.consentType,
    policy_version: policyVersion,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay kaydı oluşturulamadı.");
  }
}

/** Records consent withdrawal (GDPR Art. 7(3)). */
export async function revokeConsent(input: ConsentRecordInput): Promise<void> {
  if (!isRevocableConsentType(input.consentType)) {
    throw new ApiError("VALIDATION_ERROR", "Bu onay türü geri çekilemez.");
  }

  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;
  const policyVersion = consentPolicyVersion(input.consentType);

  const { error } = await db.from("consent_revocations").insert({
    user_id: input.userId,
    consent_type: input.consentType,
    policy_version: policyVersion,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Onay geri çekme kaydı oluşturulamadı.");
  }
}

async function hasActiveConsent(
  userId: string,
  consentType: ConsentType,
): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const db = admin as unknown as SupabaseClient;
  const expectedVersion = consentPolicyVersion(consentType);

  const { data: consent, error: consentError } = await db
    .from("consent_records")
    .select("accepted_at")
    .eq("user_id", userId)
    .eq("consent_type", consentType)
    .eq("policy_version", expectedVersion)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (consentError) {
    throw new ApiError("INTERNAL_ERROR", "Onay durumu okunamadı.");
  }
  if (!consent) return false;

  const { data: revocation, error: revokeError } = await db
    .from("consent_revocations")
    .select("revoked_at")
    .eq("user_id", userId)
    .eq("consent_type", consentType)
    .eq("policy_version", expectedVersion)
    .gt("revoked_at", consent.accepted_at)
    .order("revoked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (revokeError) {
    throw new ApiError("INTERNAL_ERROR", "Onay durumu okunamadı.");
  }

  return !revocation;
}

export async function getConsentStatus(userId: string): Promise<ConsentStatus> {
  const [termsPrivacy, aiHealth, photoAnalysis, pushNotifications] = await Promise.all([
    hasActiveConsent(userId, CONSENT_TYPES.TERMS_PRIVACY),
    hasActiveConsent(userId, CONSENT_TYPES.AI_HEALTH),
    hasActiveConsent(userId, CONSENT_TYPES.PHOTO_ANALYSIS),
    hasActiveConsent(userId, CONSENT_TYPES.PUSH_NOTIFICATIONS),
  ]);

  return { termsPrivacy, aiHealth, photoAnalysis, pushNotifications };
}

export async function assertConsent(
  userId: string,
  consentType: ConsentType,
): Promise<void> {
  const ok = await hasActiveConsent(userId, consentType);
  if (!ok) {
    throw new ApiError(
      "FORBIDDEN",
      consentType === CONSENT_TYPES.AI_HEALTH || consentType === CONSENT_TYPES.PHOTO_ANALYSIS
        ? "AI ve sağlık verisi işleme onayı gerekli."
        : "Kullanım koşulları ve gizlilik politikası onayı gerekli.",
    );
  }
}
