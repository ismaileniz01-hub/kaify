import { seoCanonicalOrigin } from "@/lib/seo/origin";

export function MarketingJsonLd() {
  const origin = seoCanonicalOrigin();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Kaify Ai",
        legalName: "Kaify Ai",
        url: origin,
        logo: `${origin}/icons/icon-512.png`,
      },
      {
        "@type": "WebSite",
        name: "Kaify Ai",
        url: origin,
      },
      {
        "@type": "SoftwareApplication",
        name: "Kaify Ai",
        url: origin,
        applicationCategory: "HealthApplication",
        operatingSystem: "Web, iOS, Android",
        offers: {
          "@type": "Offer",
          price: "14.99",
          priceCurrency: "USD",
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
