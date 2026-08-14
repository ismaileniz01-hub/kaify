import type { Metadata } from "next";
import { seoAbsoluteUrl, seoCanonicalOrigin } from "@/lib/seo/origin";

const SITE_NAME = "Kaify Ai";

export const DEFAULT_SEO_TITLE = "Kaify Ai — Your Personal Coach Team";
export const DEFAULT_SEO_DESCRIPTION =
  "Four expert coaches, smart analytics, and Kai your dragon companion. Plans from $14.99/month.";

export function publicPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const canonical = seoAbsoluteUrl(input.path);
  const index = input.index !== false;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: seoAbsoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [seoAbsoluteUrl("/opengraph-image")],
    },
  };
}

export function rootMetadata(): Metadata {
  const origin = seoCanonicalOrigin();
  const page = publicPageMetadata({
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    path: "/",
    index: true,
  });
  return {
    metadataBase: new URL(origin),
    applicationName: SITE_NAME,
    ...page,
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: SITE_NAME,
    },
  };
}
