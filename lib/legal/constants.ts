/** Legal document versions — bump when policy text changes (triggers re-consent). */

export const TERMS_VERSION = "1.0.0";
export const PRIVACY_VERSION = "2026-07-05";
export const COOKIES_VERSION = "2026-07-05";

export const LEGAL_ENTITY = "Kaify Ai";
export const LEGAL_URL = "https://kaifyai.org";
export const TERMS_PATH = "/terms&conditions";
export const COOKIES_PATH = "/cookies";
export const SUPPORT_EMAIL = "support@kaifyai.org";
export const PRIVACY_EMAIL = "privacy@kaifyai.org";

/** Termly embed data-id for /privacy (set in Vercel env when available). */
export const PRIVACY_TERMLY_DATA_ID =
  process.env.NEXT_PUBLIC_TERMLY_PRIVACY_DATA_ID?.trim() ?? "";

export const CONSENT_TYPES = {
  TERMS_PRIVACY: "terms_privacy",
  AI_HEALTH: "ai_health",
  PHOTO_ANALYSIS: "photo_analysis",
  PUSH_NOTIFICATIONS: "push_notifications",
} as const;

export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES];

export const PENDING_LEGAL_CONSENT_KEY = "kaify_legal_pending";

export type PendingLegalConsent = {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
};

export function consentPolicyVersion(type: ConsentType): string {
  switch (type) {
    case CONSENT_TYPES.TERMS_PRIVACY:
      return `${TERMS_VERSION}+${PRIVACY_VERSION}`;
    case CONSENT_TYPES.AI_HEALTH:
      return "ai_health_v1";
    case CONSENT_TYPES.PHOTO_ANALYSIS:
      return "photo_analysis_v1";
    case CONSENT_TYPES.PUSH_NOTIFICATIONS:
      return "push_notifications_v1";
    default:
      return "unknown";
  }
}
