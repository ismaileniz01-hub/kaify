import {
  GOVERNING_LAW_PROVISIONAL,
  LEGAL_ENTITY,
  LEGAL_OPERATIONAL_ADDRESS,
  LEGAL_URL,
  PADDLE_BUYER_TERMS_URL,
  PADDLE_PRIVACY_URL,
  PADDLE_REFUND_POLICY_URL,
  PRIVACY_EMAIL,
  PRIVACY_PATH,
  SUPPORT_EMAIL,
  TERMS_VERSION,
  VENUE_PROVISIONAL,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const TERMS_DOCUMENT: LegalDocument = {
  title: "Terms of Service",
  subtitle: `Last updated: August 21, 2026 · Version ${TERMS_VERSION} · English controlling`,
  intro: `These Terms of Service ("Terms") form a binding agreement between you and ${LEGAL_ENTITY} for use of Kaify (${LEGAL_URL}), a subscription-based fitness and wellness technology service. By creating an account, clicking accept, or using Kaify, you agree to these Terms and our Privacy Policy. If you do not agree, do not use Kaify.`,
  sections: [
    {
      id: "parties",
      title: "1. Parties and protection of individuals",
      blocks: [
        {
          type: "p",
          text: `The contracting party is ${LEGAL_ENTITY}, operating Kaify at ${LEGAL_URL}. Operational address currently published: ${LEGAL_OPERATIONAL_ADDRESS}. The registered legal entity name, company registration number, and registered office must be confirmed by counsel (see LEGAL_FACTS_REQUIRED).`,
        },
        {
          type: "p",
          text: "To the maximum extent permitted by law: (a) this agreement is solely between you and the Kaify operating legal entity; (b) no founder, director, officer, employee, contractor, investor, shareholder, affiliate, or licensor is individually a party to these Terms; and (c) claims relating to Kaify must be brought against the operating legal entity and not against those protected individuals, except where applicable law does not permit such limitation.",
        },
        {
          type: "p",
          text: "Paddle (the applicable Paddle group company acting as Merchant of Record) processes payment transactions. Paddle is not the provider of Kaify's fitness content, AI coaches, or product functionality.",
        },
      ],
    },
    {
      id: "eligibility",
      title: "2. Eligibility and age (16+)",
      blocks: [
        {
          type: "p",
          text: "No person under 16 may create an account or use Kaify. By registering you represent that you are at least 16 years old and that information you provide is accurate.",
        },
        {
          type: "p",
          text: "If you are 16 or 17 and have not reached the age of legal majority in your jurisdiction, you represent that a parent or legal guardian has reviewed these Terms and the Privacy Policy and authorized your use. Kaify may request age or guardian verification where reasonably necessary and may suspend or delete an account if it reasonably believes you are underage or lack required authorization.",
        },
        {
          type: "p",
          text: "A parent or guardian who permits a minor's use is responsible for supervising that use to the extent permitted by law. Kaify does not claim that every user aged 16 or 17 is an adult.",
        },
      ],
    },
    {
      id: "contract-formation",
      title: "3. Contract formation and electronic acceptance",
      blocks: [
        {
          type: "p",
          text: "You form a contract with Kaify when you create an account and accept these Terms (including via checkbox or equivalent control). Purchase of a subscription also forms a payment transaction with Paddle under Paddle's Buyer Terms. Electronic records of acceptance (version, timestamp, and related evidence) may be retained as described in our Privacy Policy.",
        },
      ],
    },
    {
      id: "service",
      title: "4. Service description",
      blocks: [
        {
          type: "p",
          text: "Kaify is a fitness and general wellness technology service offering AI-assisted virtual coaches (including Alex, Maya, Leo, and Kai), streaks, analytics, optional meal and physique photo analysis, programs, and related features. Results vary. Kaify does not promise any particular weight, body composition, strength, performance, health, income, or lifestyle outcome.",
        },
        {
          type: "p",
          text: "Recommendations depend on information you provide, which may be incomplete or inaccurate. You must exercise judgment and adapt activities to your condition and environment. Access may require compatible devices, browsers, internet connectivity, and third-party services.",
        },
        {
          type: "p",
          text: "Kaify may add, remove, modify, replace, or discontinue features, plans, content, or technical requirements. Beta or experimental features may be incomplete, inaccurate, or withdrawn without liability beyond mandatory law.",
        },
      ],
    },
    {
      id: "medical",
      title: "5. Medical and physical-activity disclaimer",
      blocks: [
        {
          type: "p",
          text: "Kaify is not a healthcare provider, medical professional, emergency service, insurer, or medical device. Kaify does not provide medical diagnosis, treatment, prescriptions, physiotherapy, emergency care, or individualized medical advice. Content is for general informational, educational, fitness, and wellness purposes only and is not a substitute for a physician or other qualified professional.",
        },
        {
          type: "p",
          text: "If you have medical conditions, injuries, pregnancy, symptoms, medications, disabilities, or uncertainty, obtain professional advice before participating. Stop activity and seek appropriate help if you experience pain, dizziness, faintness, chest discomfort, breathing difficulty, or other concerning symptoms. Call local emergency services (for example 112 or 911) for emergencies — do not use Kaify.",
        },
        {
          type: "ul",
          items: [
            "You are responsible for choosing a safe environment, equipment, intensity, form, and activity level.",
            "Exercise, nutrition changes, fasting, supplements, and physical activity involve inherent risks.",
            "You voluntarily assume ordinary risks inherent in activities you choose to perform, to the extent permitted by law.",
            "Kaify cannot monitor your physical condition or surroundings in real time.",
            "Nothing in these Terms excludes liability that cannot legally be excluded.",
          ],
        },
        {
          type: "p",
          text: "A dedicated Medical & Fitness Disclaimer is also published on this site and short-form warnings appear in onboarding and relevant product flows.",
        },
      ],
    },
    {
      id: "ai",
      title: "6. AI-generated content",
      blocks: [
        {
          type: "p",
          text: "Kaify uses AI systems (including third-party providers such as Google Gemini for vision-related analysis and DeepSeek for conversational coaching) to generate responses, plans, and analyses. AI outputs may be incomplete, inaccurate, outdated, unsafe, or inappropriate for you. Outputs are not reviewed by a healthcare professional unless the product expressly states otherwise.",
        },
        {
          type: "ul",
          items: [
            "You must independently evaluate recommendations before acting.",
            "Do not rely on AI output for emergencies, diagnosis, medication, or treatment.",
            "Kaify does not guarantee availability, accuracy, uniqueness, or suitability of AI output.",
            "Kaify may restrict prompts and outputs for safety, abuse prevention, or legal reasons.",
            "You must not submit inputs that infringe third-party rights or that you lack authority to provide.",
          ],
        },
        {
          type: "p",
          text: "Kaify does not claim that AI providers never retain or train on data. Processing is described in the Privacy Policy and depends on provider contracts and technical controls then in force.",
        },
      ],
    },
    {
      id: "accounts",
      title: "7. Accounts and security",
      blocks: [
        {
          type: "p",
          text: "Provide accurate registration information. Access is typically via email one-time codes (OTP), magic link, or supported OAuth. You are responsible for securing your email account, devices, and sessions. Credential sharing, account resale, and unauthorized multi-account abuse are prohibited.",
        },
        {
          type: "ul",
          items: [
            "Notify us promptly of unauthorized access at " + SUPPORT_EMAIL + ".",
            "Kaify may require password or session resets, revoke sessions, or temporarily lock accounts.",
            "Kaify may preserve evidence and cooperate with lawful investigations.",
            "Kaify has no obligation to restore deleted user content unless required by law.",
          ],
        },
      ],
    },
    {
      id: "license",
      title: "8. License to use the service",
      blocks: [
        {
          type: "p",
          text: "Subject to these Terms and your subscription status, Kaify grants you a limited, revocable, non-exclusive, non-transferable, non-sublicensable license for personal, non-commercial use of the service during authorized access. Subscriptions purchase access, not ownership of software, content, or data compilations.",
        },
      ],
    },
    {
      id: "acceptable-use",
      title: "9. Acceptable use",
      blocks: [
        {
          type: "p",
          text: "You may not:",
        },
        {
          type: "ul",
          items: [
            "Use Kaify for illegal, fraudulent, abusive, harassing, dangerous, or deceptive purposes",
            "Scrape, crawl, harvest data, or automate access without permission",
            "Reverse engineer except where mandatory law expressly permits",
            "Circumvent subscription, security, rate limits, access controls, or technical restrictions",
            "Share or resell access",
            "Introduce malware, exploit vulnerabilities, or interfere with the service",
            "Upload content without required rights",
            "Impersonate others or provide false identity",
            "Use Kaify to develop or benchmark a competing product without written permission where enforceable",
            "Extract datasets, workout libraries, prompts, output collections, or models",
            "Use Kaify for clinical or emergency decision-making",
            "Commit chargeback fraud, refund abuse, or promotion abuse",
          ],
        },
        {
          type: "p",
          text: "Kaify may investigate, restrict, suspend, or terminate accounts for violations.",
        },
      ],
    },
    {
      id: "ip",
      title: "10. Intellectual property",
      blocks: [
        {
          type: "p",
          text: `Kaify and its licensors own all rights in the software (including source and object code), brand, trademarks, designs, UI, graphics, copy, videos, workouts, programs, databases, methodologies, algorithms, prompts, compilations, and licensed third-party content. Except for the limited license above, no rights are transferred to you.`,
        },
      ],
    },
    {
      id: "user-content",
      title: "11. User content",
      blocks: [
        {
          type: "p",
          text: "You retain ownership of content you submit (messages, photos, profile data, notes). You grant Kaify a worldwide, non-exclusive, royalty-free license to host, process, reproduce, adapt, transmit, display, secure, moderate, and otherwise operate and improve the service, including anonymized or aggregated analytics where permitted by the Privacy Policy. This license does not transfer ownership of your content.",
        },
        {
          type: "p",
          text: "You warrant that you have the rights and permissions needed for your content. Kaify may remove or restrict content but is not obligated to monitor all content. Kaify does not endorse user content. You are responsible for your own backups unless Kaify expressly provides a backup feature.",
        },
      ],
    },
    {
      id: "paddle",
      title: "12. Paddle and payment structure",
      blocks: [
        {
          type: "p",
          text: "Two relationships apply: (1) Kaify provides and licenses the product and service; (2) Paddle acts as Merchant of Record and authorized reseller for the payment transaction. The purchase is processed by the applicable Paddle entity. Paddle's Buyer Terms, Refund Policy, and Privacy Notice apply to payment transactions:",
        },
        {
          type: "ul",
          items: [
            `Buyer Terms: ${PADDLE_BUYER_TERMS_URL}`,
            `Refund Policy: ${PADDLE_REFUND_POLICY_URL}`,
            `Privacy Notice: ${PADDLE_PRIVACY_URL}`,
          ],
        },
        {
          type: "ul",
          items: [
            "Paddle may calculate and collect applicable taxes and issue receipts.",
            "Paddle manages supported payment methods and may use authentication, fraud prevention, retry, and chargeback procedures.",
            "Kaify generally does not receive complete payment-card numbers or full card details.",
            "Keep billing and contact information accurate with Paddle.",
            "Transaction disputes, refunds, and billing support may be directed to Paddle (including via paddle.net).",
            "Kaify may assist with product-access issues but cannot override Paddle's legal or payment obligations.",
          ],
        },
      ],
    },
    {
      id: "subscriptions",
      title: "13. Subscriptions, renewal, and plan changes",
      blocks: [
        {
          type: "p",
          text: "Paid plans (names, intervals, and prices as displayed at checkout and on the pricing page) renew automatically unless cancelled before renewal. Charges occur at the start of each billing period (and when you start a paid plan or convert from a trial, if offered). Taxes, currency, and local pricing may vary by region and are shown in Paddle Checkout.",
        },
        {
          type: "ul",
          items: [
            "Cancel via Paddle Customer Portal / Manage billing in Settings (or other methods Kaify discloses).",
            "Cancellation typically stops future renewal; access usually continues until the end of the paid period unless immediate cancellation applies (for example on account deletion).",
            "Failed payments may result in past-due status, retries, grace periods if configured, and loss of paid features.",
            "Upgrades, downgrades, pauses, and proration follow Paddle Billing rules and any preview shown before confirmation.",
            "Virtual items (gems, cosmetics) are licensed for in-app use only, have no cash value, are non-transferable, and may be forfeited on termination.",
          ],
        },
        {
          type: "p",
          text: "Account deletion is separate from subscription cancellation. Deleting your account cancels live Paddle subscriptions immediately where technically successful, then deletes account data as described in our Privacy Policy and deletion documentation. Deletion does not automatically create a refund.",
        },
      ],
    },
    {
      id: "refunds",
      title: "14. Refunds and withdrawal rights",
      blocks: [
        {
          type: "p",
          text: "Except where required by applicable law or Paddle's binding policies, payments are non-refundable and non-exchangeable. Cancellation ordinarily prevents future renewal but does not retroactively refund a completed billing period.",
        },
        {
          type: "p",
          text: "Refunds and statutory withdrawal / cooling-off rights (where they apply to digital content or services) are processed under Paddle's Buyer Terms and Refund Policy. Kaify may provide discretionary assistance but does not promise a refund outside applicable law and Paddle's approved process. Refunds may be denied for fraud, abuse, manipulation, or repeated refund misuse, subject to law. A successful refund or chargeback may result in suspension or removal of corresponding paid access.",
        },
        {
          type: "p",
          text: "These Terms do not waive mandatory consumer, withdrawal, or defective-digital-service rights that cannot be waived.",
        },
      ],
    },
    {
      id: "price-changes",
      title: "15. Price and feature changes",
      blocks: [
        {
          type: "p",
          text: "Kaify may introduce new plans and change subscription prices for future billing periods. Price changes do not retroactively affect a billing period already paid for. For an existing recurring subscription, an increased price may take effect on a future renewal after notice through Kaify, Paddle, or both. Where applicable law requires affirmative consent, the increased price will not be charged without that consent. If you do not accept the new price, the subscription may remain at its existing price where Kaify permits, or it may expire at the end of the then-current billing period. You may cancel before the new price takes effect. Taxes, currency conversion, and payment-method charges may vary independently where permitted.",
        },
        {
          type: "p",
          text: "Creating a new catalog price does not automatically change existing subscriptions. Updates must use the proper Paddle Billing process. Kaify should preview proration before user-initiated plan changes. Terms wording alone is not a substitute for required notices or consent.",
        },
      ],
    },
    {
      id: "suspension",
      title: "16. Suspension and termination",
      blocks: [
        {
          type: "p",
          text: "Kaify may suspend or terminate access for Terms violations, non-payment, chargebacks or suspected payment abuse, fraud or security threats, dangerous or unlawful conduct, IP misuse, requests from Paddle, legal or regulatory obligations, risk to Kaify/users/third parties, extended inactivity where disclosed, or discontinuation of the service. Immediate action may be taken for serious security, fraud, safety, or legal threats. Where reasonable and legally required, Kaify will provide notice and an appeal channel via " +
            SUPPORT_EMAIL +
            ".",
        },
        {
          type: "p",
          text: "Effects may include loss of account access, subscription changes, content unavailability, and limited refund eligibility. Provisions that by nature should survive (including IP, disclaimers, liability limits, indemnity where enforceable, and governing law) survive termination. Data may be retained as required for legal claims, fraud prevention, accounting, or compliance.",
        },
      ],
    },
    {
      id: "disclaimers",
      title: "17. Disclaimer of warranties",
      blocks: [
        {
          type: "p",
          text: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." KAIFY DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT (WHERE DISCLAIMABLE), CONTINUOUS AVAILABILITY, ERROR-FREE OPERATION, ACCURACY, COMPLETENESS, FITNESS OR HEALTH RESULTS, COMPATIBILITY, DATA PRESERVATION, THIRD-PARTY SERVICES, AI OUTPUTS, USER-GENERATED CONTENT, AND SECURITY AGAINST EVERY POSSIBLE THREAT. Mandatory warranties and consumer guarantees that cannot legally be excluded remain unaffected.',
        },
      ],
    },
    {
      id: "liability",
      title: "18. Limitation of liability [LEGAL REVIEW REQUIRED]",
      blocks: [
        {
          type: "p",
          text: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${LEGAL_ENTITY} AND ITS PROTECTED INDIVIDUALS AND AFFILIATES ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES; OR FOR LOST PROFITS, REVENUE, OPPORTUNITY, GOODWILL, EXPECTED SAVINGS, DATA, OR BUSINESS INTERRUPTION; OR FOR LOSSES CAUSED BY YOUR INSTRUCTIONS, INACCURATE USER DATA, UNSAFE EXERCISE CHOICES, THIRD-PARTY SYSTEMS, INTERNET FAILURES, PADDLE OUTAGES, OR FORCE-MAJEURE EVENTS.`,
        },
        {
          type: "p",
          text: `SUBJECT TO MANDATORY LAW, AGGREGATE LIABILITY ARISING FROM THE SERVICE IS LIMITED TO THE GREATER OF (A) AMOUNTS YOU PAID FOR KAIFY DURING THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) USD 100. THESE LIMITATIONS APPLY REGARDLESS OF LEGAL THEORY AND EVEN IF ADVISED OF POSSIBLE LOSS, WHERE ENFORCEABLE.`,
        },
        {
          type: "p",
          text: "Nothing excludes or limits liability for death or personal injury caused by legally actionable negligence, fraud, willful misconduct, or any other liability that cannot be limited under applicable law (including EU/UK/Türkiye mandatory consumer rights).",
        },
      ],
    },
    {
      id: "indemnity",
      title: "19. Indemnity",
      blocks: [
        {
          type: "p",
          text: `If you use Kaify in a business capacity, you will indemnify and hold harmless ${LEGAL_ENTITY} and its directors, officers, employees, and agents from claims arising from your unlawful use, Terms violations, user content, infringement of third-party rights, fraud, account misuse, or regulatory claims caused by your conduct, to the extent permitted by law.`,
        },
        {
          type: "p",
          text: "For consumers, indemnity obligations apply only to the extent enforceable in your jurisdiction and do not shift Kaify's own fault to you where prohibited.",
        },
      ],
    },
    {
      id: "governing-law",
      title: "20. Governing law and disputes [COUNSEL CONFIRMATION]",
      blocks: [
        {
          type: "p",
          text: `These Terms are provisionally governed by the laws of the ${GOVERNING_LAW_PROVISIONAL}. Courts in ${VENUE_PROVISIONAL} have non-exclusive jurisdiction, except where mandatory consumer law grants you the right to bring proceedings in your country of residence or another required forum. This provisional choice remains subject to confirmation of the operating entity's home jurisdiction by counsel.`,
        },
        {
          type: "p",
          text: `Contact ${SUPPORT_EMAIL} first to attempt informal resolution within 30 days. Kaify does not impose a global class-action waiver or mandatory US-style arbitration in these Terms. Any arbitration or class-action provisions would appear only in counsel-approved regional addenda, if any.`,
        },
      ],
    },
    {
      id: "general",
      title: "21. General provisions",
      blocks: [
        {
          type: "ul",
          items: [
            "Entire agreement: these Terms plus incorporated policies (Privacy, Cookies, Medical Disclaimer) and any order/checkout terms form the agreement, subject to mandatory law.",
            "Severability: invalid provisions are reformed to the minimum extent necessary; the rest remains in force.",
            "No waiver: failure to enforce a provision is not a waiver.",
            "Assignment: Kaify may assign to an affiliate, successor, purchaser, or acquirer; you may not assign without consent except where mandatory law allows.",
            "Electronic communications: you consent to receive notices electronically.",
            "Force majeure: Kaify is not liable for delays beyond reasonable control.",
            "Independent contractors: no partnership or employment is created.",
            "No third-party beneficiaries except where expressly stated (including protected individuals as limited beneficiaries of Sections 1 and 18 where enforceable).",
            "English controlling: English is the primary language of these Terms; translations are for convenience except where local-language notice is mandatory.",
            `Notices: ${SUPPORT_EMAIL}; privacy: ${PRIVACY_EMAIL}; Privacy Policy: ${PRIVACY_PATH}.`,
          ],
        },
      ],
    },
    {
      id: "changes",
      title: "22. Changes",
      blocks: [
        {
          type: "p",
          text: `We may update these Terms. Material changes will be notified in-app or by email where required. Continued use after the effective date constitutes acceptance where permitted. Version: ${TERMS_VERSION}.`,
        },
      ],
    },
  ],
  footer: `Questions: ${SUPPORT_EMAIL} · Privacy: ${PRIVACY_EMAIL}`,
};
