import { seoCanonicalOrigin } from "@/lib/seo/origin";

/** JSON-LD is data, not executed script — CSP does not apply, no nonce needed. */
export function MarketingJsonLd() {
  const origin = seoCanonicalOrigin();
  const orgId = `${origin}/#organization`;
  const appId = `${origin}/#app`;
  // Rich, explicit entity data helps Google and AI assistants (ChatGPT, Gemini,
  // Perplexity) understand and cite what Kaify Ai is. Keep in sync with /llms.txt.
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "Kaify Ai",
        legalName: "Kaify Ai",
        url: origin,
        logo: `${origin}/icons/icon-512.png`,
        description:
          "Kaify Ai builds an AI fitness coaching app with four specialised AI coaches for training, nutrition, posture and motivation.",
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Kaify Ai",
        url: origin,
        inLanguage: "en",
        publisher: { "@id": orgId },
      },
      {
        "@type": "SoftwareApplication",
        "@id": appId,
        name: "Kaify Ai",
        alternateName: "Kaify",
        url: origin,
        image: `${origin}/icons/icon-512.png`,
        description:
          "AI fitness coaching app: Alex (fitness coach), Maya (nutritionist), Leo (body and posture analyst) and Kai (dragon companion) give personalised workouts, meal plans, posture analysis, progress analytics and daily motivation in one subscription.",
        applicationCategory: "HealthApplication",
        applicationSubCategory: "Fitness coaching",
        operatingSystem: "Web, iOS, Android",
        publisher: { "@id": orgId },
        featureList: [
          "Personalised AI workout plans and set tracking",
          "AI meal plans and macro targets, nutrition from a meal photo",
          "Posture and form analysis with mobility suggestions",
          "Progress analytics: weekly activity and daily macros",
          "Streaks, quests, gems and a dragon companion that grows with your habits",
          "Multilingual",
        ],
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "14.99",
          priceCurrency: "USD",
          offerCount: 3,
          url: `${origin}/pricing`,
        },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
