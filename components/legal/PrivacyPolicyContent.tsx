import Link from "next/link";
import type { ReactNode } from "react";
import {
  LEGAL_ENTITY,
  LEGAL_URL,
  PRIVACY_EMAIL,
  PRIVACY_VERSION,
  SUPPORT_EMAIL,
} from "@/lib/legal/constants";

type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

const sections: LegalSection[] = [
  {
    id: "intro",
    title: "1. Introduction",
    body: (
      <p>
        {LEGAL_ENTITY} (&quot;Kaify&quot;, &quot;we&quot;, &quot;us&quot;) operates {LEGAL_URL} and
        the Kaify mobile web application. This Privacy Policy explains what personal data we
        collect, why we use it, who we share it with, and your rights under GDPR, UK GDPR, and
        KVKK (Turkey).
      </p>
    ),
  },
  {
    id: "data-collected",
    title: "2. Data We Collect",
    body: (
      <>
        <ul>
          <li>
            <strong>Account:</strong> email address, profile name, locale, timezone, country
          </li>
          <li>
            <strong>Health & fitness:</strong> steps, streaks, workout notes, body metrics,
            optional injury notes, photo analysis results (not stored as public images)
          </li>
          <li>
            <strong>AI chat:</strong> messages you send to coaches, coaching memory summaries
          </li>
          <li>
            <strong>Usage:</strong> gem balance, market purchases, referral activity, analytics
            aggregates
          </li>
          <li>
            <strong>Technical:</strong> IP address (security/rate limits), device/browser type,
            session cookies
          </li>
          <li>
            <strong>Payments:</strong> processed by Paddle (Merchant of Record) — we receive subscription
            status and billing email, not card numbers
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "lawful-basis",
    title: "3. Lawful Basis (GDPR Art. 6 & 9)",
    body: (
      <>
        <p>
          We process account and service data under <strong>contract</strong> (providing the app)
          and <strong>legitimate interests</strong> (security, fraud prevention).
        </p>
        <p>
          Health-related data, photos for AI analysis, and automated coaching require your{" "}
          <strong>explicit consent</strong> (GDPR Art. 9). You can withdraw consent in Settings;
          withdrawal may limit AI features.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "4. AI & Automated Processing",
    body: (
      <p>
        Kaify uses third-party AI providers (Google Gemini, DeepSeek) to generate coaching
        responses and analyze photos. Prompts are sanitized; images are processed transiently
        for analysis. Outputs are not medical advice. See our{" "}
        <Link href="/terms&conditions" className="text-emerald-400 underline">
          Terms of Service
        </Link>{" "}
        for disclaimers.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "5. Subprocessors & Sharing",
    body: (
      <>
        <p>We share data only with service providers needed to run Kaify:</p>
        <ul>
          <li>Supabase (database, auth, storage) — EU (Frankfurt)</li>
          <li>Vercel (hosting)</li>
          <li>Google Gemini / DeepSeek (AI inference)</li>
          <li>Sentry (error monitoring)</li>
          <li>Paddle (payments)</li>
          <li>Google reCAPTCHA (bot protection on waitlist)</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal data. See{" "}
          <Link href="/cookies" className="text-emerald-400 underline">
            Cookie Policy
          </Link>{" "}
          for cookie details.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "6. International Transfers",
    body: (
      <p>
        Some providers process data in the United States or other countries. Where required, we
        rely on Standard Contractual Clauses (SCCs) or equivalent safeguards. AI API calls may
        route through US or other regions depending on provider infrastructure.
      </p>
    ),
  },
  {
    id: "retention",
    title: "7. Retention",
    body: (
      <p>
        We keep your data while your account is active. After account deletion, core profile
        and associated records are removed via cascade delete. Some anonymized analytics or
        legal logs may be retained longer where required by law. Target: delete or anonymize
        within <strong>6 months</strong> after account termination unless law requires longer
        storage.
      </p>
    ),
  },
  {
    id: "rights",
    title: "8. Your Rights",
    body: (
      <>
        <p>You may have the right to:</p>
        <ul>
          <li>Access your data (export JSON in Settings → Security)</li>
          <li>Rectify inaccurate profile data</li>
          <li>Delete your account (right to erasure)</li>
          <li>Restrict or object to certain processing</li>
          <li>Withdraw consent for AI/health processing</li>
          <li>Lodge a complaint with your supervisory authority</li>
        </ul>
        <p>
          Contact:{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-emerald-400 underline">
            {PRIVACY_EMAIL}
          </a>{" "}
          — we respond within 30 days where GDPR/KVKK applies.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "9. Children",
    body: (
      <p>
        Kaify is for users aged <strong>16 and over</strong>. We do not knowingly collect data
        from children under 16. Contact us to request deletion if you believe a minor registered.
      </p>
    ),
  },
  {
    id: "security",
    title: "10. Security",
    body: (
      <p>
        We use encryption in transit (HTTPS), row-level security in the database, MFA support,
        rate limiting, and access controls. No method is 100% secure; report concerns to{" "}
        {SUPPORT_EMAIL}.
      </p>
    ),
  },
  {
    id: "changes",
    title: "11. Changes & Contact",
    body: (
      <>
        <p>
          We may update this policy. Material changes will be notified in-app or by email.
          Version: {PRIVACY_VERSION} · Last updated: July 05, 2026.
        </p>
        <p>
          {LEGAL_ENTITY} · Toros Mah., Çukurova, Adana 01150, Turkey · {PRIVACY_EMAIL}
        </p>
      </>
    ),
  },
];

export function PrivacyPolicyContent() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-emerald-400 prose-li:text-zinc-300">
      <nav className="not-prose mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Contents
        </p>
        <ul className="grid gap-1 text-sm text-emerald-300/90 sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ul>
      </nav>
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="mb-10">
          <h2>{s.title}</h2>
          <div className="text-zinc-300 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
            {s.body}
          </div>
        </section>
      ))}
    </article>
  );
}
