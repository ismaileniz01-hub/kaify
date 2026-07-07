import {
  LEGAL_ENTITY,
  LEGAL_URL,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const TERMS_DOCUMENT: LegalDocument = {
  title: "Terms of Service",
  subtitle: `Last updated: July 05, 2026 · Version ${TERMS_VERSION}`,
  intro:
    'These Terms of Service ("Terms") govern your use of Kaify. By creating an account you agree to these Terms and our Privacy Policy.',
  sections: [
    {
      id: "services",
      title: "1. Services",
      blocks: [
        {
          type: "p",
          text: `${LEGAL_ENTITY} operates Kaify (${LEGAL_URL}), an AI-assisted fitness coaching application with virtual coaches, streaks, analytics, and optional photo analysis. We may modify, suspend, or discontinue features with reasonable notice where required by law.`,
        },
      ],
    },
    {
      id: "ai-disclaimer",
      title: "2. AI & Fitness — Not Medical Advice",
      blocks: [
        {
          type: "p",
          text: "Kaify is not a medical device and does not provide medical, nutritional, physiotherapy, or emergency services. AI outputs may be incomplete or incorrect. You must consult a qualified professional before changing diet, exercise, or treatment. Do not use Kaify for emergencies — call local emergency services (112 / 911).",
        },
        {
          type: "p",
          text: "You assume the inherent risks of physical activity. By using AI features you acknowledge that automated coaching is not a substitute for professional judgment.",
        },
      ],
    },
    {
      id: "eligibility",
      title: "3. Eligibility (16+)",
      blocks: [
        {
          type: "p",
          text: "You must be at least 16 years old. By registering you represent that you meet this requirement and that information you provide is accurate.",
        },
      ],
    },
    {
      id: "account",
      title: "4. Account & Passwordless Auth",
      blocks: [
        {
          type: "p",
          text: "Access is via magic link or OAuth. You are responsible for securing your email account and devices. One natural person, one account — automation, scraping, and multi-account abuse are prohibited.",
        },
      ],
    },
    {
      id: "subscriptions",
      title: "5. Subscriptions & Payments",
      blocks: [
        {
          type: "p",
          text: "Paid plans are processed by Paddle as Merchant of Record (tax, invoicing, payment collection). Subscriptions renew automatically unless cancelled before the renewal date. Unless mandatory law provides otherwise, fees are non-refundable once digital access is granted.",
        },
        {
          type: "p",
          text: "Virtual items (gems, cosmetics) are licensed for in-app use only, have no cash value, are non-transferable, and may be forfeited on account termination.",
        },
      ],
    },
    {
      id: "user-content",
      title: "6. User Content & Health Data",
      blocks: [
        {
          type: "p",
          text: "You retain ownership of content you submit (messages, photos, profile data). You grant us a worldwide, royalty-free license to host, process, and display it to operate the service, enforce safety, and improve features (including anonymized analytics where permitted by our Privacy Policy).",
        },
        {
          type: "p",
          text: "Processing of health-related and photo data requires your explicit consent in the app and is described in our Privacy Policy.",
        },
      ],
    },
    {
      id: "prohibited",
      title: "7. Prohibited Use",
      blocks: [
        {
          type: "p",
          text: "You may not: violate law; harass others; upload illegal or non-consensual imagery; attempt prompt injection or model abuse; scrape or reverse engineer the service; commit referral or payment fraud; or overload infrastructure. We may suspend or terminate accounts without refund where permitted.",
        },
      ],
    },
    {
      id: "privacy",
      title: "8. Privacy & Cookies",
      blocks: [
        {
          type: "p",
          text: "Our Privacy Policy and Cookie Policy are incorporated by reference. EU/UK users retain mandatory data protection rights that cannot be waived by these Terms.",
        },
      ],
    },
    {
      id: "third-party",
      title: "9. Third-Party Services",
      blocks: [
        {
          type: "p",
          text: "We rely on subprocessors including Supabase, Google (Gemini), DeepSeek, Vercel, Sentry, Paddle, and reCAPTCHA. Their availability affects ours; we are not liable for third-party outages beyond mandatory law.",
        },
      ],
    },
    {
      id: "liability",
      title: "10. Disclaimers & Limitation of Liability",
      blocks: [
        {
          type: "p",
          text: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT.',
        },
        {
          type: "p",
          text: `To the maximum extent permitted by law, ${LEGAL_ENTITY} is not liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill. Our aggregate liability for any claims arising from the service is limited to the greater of (a) amounts you paid in the twelve (12) months before the claim or (b) USD 100.`,
        },
        {
          type: "p",
          text: "Nothing here limits liability that cannot be excluded under applicable consumer law (including EU/UK/Turkey mandatory rights).",
        },
      ],
    },
    {
      id: "indemnity",
      title: "11. Indemnification",
      blocks: [
        {
          type: "p",
          text: `You agree to indemnify ${LEGAL_ENTITY} against claims arising from your misuse, your content, or violation of these Terms, except where prohibited for consumers in your jurisdiction.`,
        },
      ],
    },
    {
      id: "dispute",
      title: "12. Governing Law & Disputes",
      blocks: [
        {
          type: "p",
          text: "These Terms are governed by the laws of the Republic of Türkiye. Courts in Adana, Türkiye have non-exclusive jurisdiction, except where EU/UK consumer law grants you the right to bring proceedings in your country of residence.",
        },
        {
          type: "p",
          text: `Contact us first at ${SUPPORT_EMAIL} to resolve disputes informally within 30 days. Where enforceable, US users may agree to binding individual arbitration and class action waiver — see regional addenda in the full legal package.`,
        },
      ],
    },
    {
      id: "changes",
      title: "13. Changes & Contact",
      blocks: [
        {
          type: "p",
          text: `We may update these Terms. Material changes will be notified in-app or by email. Continued use after the effective date constitutes acceptance where permitted. Version: ${TERMS_VERSION}.`,
        },
        {
          type: "p",
          text: `Questions: ${SUPPORT_EMAIL} · Privacy: ${PRIVACY_EMAIL}`,
        },
      ],
    },
  ],
};

