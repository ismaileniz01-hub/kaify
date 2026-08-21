import {
  COOKIES_VERSION,
  LEGAL_URL,
  PRIVACY_PATH,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const COOKIES_DOCUMENT: LegalDocument = {
  title: "Cookie Policy",
  subtitle: `Last updated: August 21, 2026 · Version ${COOKIES_VERSION}`,
  intro: `This Cookie Policy explains how Kaify (${LEGAL_URL}) uses cookies, pixels, tags, local storage, session storage, and similar browser technologies. Native mobile SDKs (for example push tokens) are not cookies and are described in the Privacy Policy.`,
  sections: [
    {
      id: "overview",
      title: "1. Overview and consent",
      blocks: [
        {
          type: "p",
          text: "Strictly necessary technologies run to provide the service you request. Non-essential analytics or marketing technologies activate only after you accept them in our cookie banner (Accept All / Reject optional / Manage preferences where offered). Categories are not pre-enabled for optional use. You can change preferences by clearing kaify_cookie_consent or using Cookie Preferences links. Global Privacy Control will be honored where legally required and technically supported.",
        },
      ],
    },
    {
      id: "essential",
      title: "2. Strictly necessary",
      blocks: [
        {
          type: "ul",
          items: [
            "Supabase auth cookies — session / signed-in state (first-party; duration per auth SDK)",
            "kaify_csrf — CSRF protection for sensitive actions (first-party cookie)",
            "kaify_stepup — step-up MFA window (first-party cookie)",
            "kaify_admin_hub — admin hub session when applicable (first-party cookie)",
            "kaify-lang — locale preference (cookie and/or localStorage)",
            "kaify_cookie_consent — stores your cookie choice, version, and timestamp (localStorage)",
            "kaify_legal_pending — temporary pre-auth Terms/Privacy acceptance sync (localStorage)",
            "Paddle Checkout technologies — necessary to open and secure a checkout you request (third-party; vendor-controlled)",
          ],
        },
      ],
    },
    {
      id: "functional",
      title: "3. Functional (product preferences)",
      blocks: [
        {
          type: "p",
          text: "These improve UX and are generally first-party localStorage (not advertising). Examples: kaify-theme, kaify-unit, sound preferences, streak/gamification client state, referral codes, OTP resume (sessionStorage), analytics cache bundle (sessionStorage). They are not used to sell your data.",
        },
      ],
    },
    {
      id: "analytics",
      title: "4. Analytics (optional — consent required where applicable)",
      blocks: [
        {
          type: "ul",
          items: [
            "Vercel Analytics / Speed Insights — anonymous or pseudonymous usage and performance metrics (loaded only after optional cookie acceptance; skipped on native app shell)",
            "First-party product analytics (workout/meal aggregates stored in Kaify databases) are not browser advertising cookies; see Privacy Policy",
          ],
        },
      ],
    },
    {
      id: "marketing",
      title: "5. Marketing / third-party (optional or contextual)",
      blocks: [
        {
          type: "ul",
          items: [
            "Sender.net — waitlist/marketing email tooling when the optional analytics/marketing path is accepted (may set third-party cookies/scripts)",
            "Google reCAPTCHA — bot protection on waitlist forms (may set cookies; necessary for that form's abuse protection)",
          ],
        },
        {
          type: "p",
          text: "Termly embeds are not the canonical Privacy Policy host; if a Termly script is enabled via environment configuration it may set cookies on legal pages. Prefer the in-repo Privacy Policy at /privacy.",
        },
      ],
    },
    {
      id: "sentry",
      title: "6. Error monitoring",
      blocks: [
        {
          type: "p",
          text: "Sentry error monitoring initializes for reliability and security. It is treated as an operational necessity for running the service; payloads are scrubbed of obvious PII where configured. If counsel classifies Sentry as non-essential in a specific jurisdiction, loading must be gated behind consent — tracked in LEGAL_IMPLEMENTATION_CHECKLIST.",
        },
      ],
    },
    {
      id: "manage",
      title: "7. Managing preferences",
      blocks: [
        {
          type: "p",
          text: `Use the cookie banner controls, clear site data, or delete kaify_cookie_consent from local storage to reset. Browser settings alone are not the only withdrawal method. See also ${PRIVACY_PATH}. Version: ${COOKIES_VERSION}.`,
        },
      ],
    },
  ],
};
