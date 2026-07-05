import { COOKIES_VERSION } from "@/lib/legal/constants";

/** Browser cookie preference (non-essential / analytics). Essential auth cookies always apply. */

export const COOKIE_CONSENT_KEY = "kaify_cookie_consent";
export const COOKIE_CONSENT_VERSION = COOKIES_VERSION;

export type CookieConsentChoice = "accepted" | "rejected";

export type StoredCookieConsent = {
  choice: CookieConsentChoice;
  version: string;
  at: string;
};

export function readCookieConsent(): StoredCookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCookieConsent;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCookieConsent(choice: CookieConsentChoice): void {
  const record: StoredCookieConsent = {
    choice,
    version: COOKIE_CONSENT_VERSION,
    at: new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent("kaify:cookie-consent", { detail: record }));
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent()?.choice === "accepted";
}

export function hasCookieConsentChoice(): boolean {
  return readCookieConsent() !== null;
}
