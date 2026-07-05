import { COOKIES_VERSION, LEGAL_URL } from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const COOKIES_DOCUMENT: LegalDocument = {
  title: "Cookie Policy",
  subtitle: `Last updated: July 05, 2026 · Version ${COOKIES_VERSION}`,
  sections: [
    {
      id: "overview",
      title: "1. Overview",
      blocks: [
        {
          type: "p",
          text: `This Cookie Policy explains how Kaify (${LEGAL_URL}) uses cookies and similar technologies. When you click Accept on our cookie banner, optional analytics cookies may be enabled. Reject optional keeps only essential cookies.`,
        },
      ],
    },
    {
      id: "essential",
      title: "2. Essential Cookies",
      blocks: [
        {
          type: "p",
          text: "These are required for the app to function and cannot be disabled:",
        },
        {
          type: "ul",
          items: [
            "Supabase auth cookies — keep you signed in securely",
            "kaify_csrf — protects account deletion, export, and purchases from cross-site attacks",
          ],
        },
      ],
    },
    {
      id: "optional",
      title: "3. Optional Cookies",
      blocks: [
        {
          type: "p",
          text: "Only loaded if you accept optional cookies:",
        },
        {
          type: "ul",
          items: [
            "Vercel Analytics / Speed Insights — anonymous usage metrics",
            "Sender.net — marketing/waitlist email (landing page only)",
          ],
        },
      ],
    },
    {
      id: "third-party",
      title: "4. Third-Party Cookies",
      blocks: [
        {
          type: "p",
          text: "Google reCAPTCHA may set cookies on the waitlist form. Termly may set cookies on legal policy pages if embedded. See our Privacy Policy for subprocessors.",
        },
      ],
    },
    {
      id: "manage",
      title: "5. Managing Preferences",
      blocks: [
        {
          type: "p",
          text: `Clear site data in your browser or delete kaify_cookie_consent from local storage to see the cookie banner again. Essential cookies will reload when you use the app. Version: ${COOKIES_VERSION}.`,
        },
      ],
    },
  ],
};

