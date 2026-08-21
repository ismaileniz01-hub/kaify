/** Legal document versions — bump when policy text changes (triggers re-consent). */

export const TERMS_VERSION = "2.0.0";
export const PRIVACY_VERSION = "2026-08-22";
export const COOKIES_VERSION = "2026-08-21";
export const MEDICAL_DISCLAIMER_VERSION = "2026-08-21";

/**
 * Display / contracting name used in product copy.
 * Formal registered company name, address details beyond the operational address,
 * and company registration numbers remain counsel placeholders — see
 * docs/compliance/LEGAL_FACTS_REQUIRED.md.
 */
export const LEGAL_ENTITY = "Kaify Ai";
export const LEGAL_ENTITY_STATUS =
  "PROVISIONAL_BRAND_NAME — counsel must confirm the registered legal entity";

export const LEGAL_URL = "https://kaifyai.org";
export const TERMS_PATH = "/terms";
export const PRIVACY_PATH = "/privacy";
export const COOKIES_PATH = "/cookies";
export const KVKK_PATH = "/kvkk";
export const MEDICAL_DISCLAIMER_PATH = "/disclaimer";
export const SUPPORT_EMAIL = "support@kaifyai.org";
/** Public privacy contact — same mailbox as support. */
export const PRIVACY_EMAIL = "support@kaifyai.org";
export const LEGAL_CONTACT_EMAIL = "support@kaifyai.org";

/** Operational address currently published (verify with counsel). */
export const LEGAL_OPERATIONAL_ADDRESS =
  "Toros Mah., Çukurova, Adana 01150, Türkiye";

/**
 * Provisional governing-law wording currently published.
 * Marked for counsel confirmation — do not invent a different jurisdiction.
 */
export const GOVERNING_LAW_PROVISIONAL = "Republic of Türkiye";
export const VENUE_PROVISIONAL = "Adana, Türkiye (non-exclusive)";

/** Termly embed data-id for /privacy (optional; in-repo policy is canonical). */
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
      return "ai_health_v2";
    case CONSENT_TYPES.PHOTO_ANALYSIS:
      return "photo_analysis_v2";
    case CONSENT_TYPES.PUSH_NOTIFICATIONS:
      return "push_notifications_v1";
    default:
      return "unknown";
  }
}

/** Official Paddle legal links (verify periodically). */
export const PADDLE_BUYER_TERMS_URL = "https://www.paddle.com/legal/buyer-terms";
export const PADDLE_REFUND_POLICY_URL =
  "https://www.paddle.com/legal/refund-policy";
export const PADDLE_PRIVACY_URL = "https://www.paddle.com/legal/privacy";
