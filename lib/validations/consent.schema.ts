import { z } from "zod";
import { CONSENT_TYPES } from "@/lib/legal/constants";

export const recordConsentSchema = z.object({
  consentType: z.enum([
    CONSENT_TYPES.TERMS_PRIVACY,
    CONSENT_TYPES.AI_HEALTH,
    CONSENT_TYPES.PHOTO_ANALYSIS,
    CONSENT_TYPES.PUSH_NOTIFICATIONS,
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const revokeConsentSchema = z.object({
  consentType: z.enum([
    CONSENT_TYPES.AI_HEALTH,
    CONSENT_TYPES.PHOTO_ANALYSIS,
    CONSENT_TYPES.PUSH_NOTIFICATIONS,
  ]),
});

export type RecordConsentInput = z.infer<typeof recordConsentSchema>;
export type RevokeConsentInput = z.infer<typeof revokeConsentSchema>;
