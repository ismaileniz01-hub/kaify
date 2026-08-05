import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PricingPage } from "@/components/landing/PricingPage";
import { PaddleProvider } from "@/components/billing/PaddleProvider";

export async function generateMetadata(): Promise<Metadata> {
  const isTurkish = (await cookies()).get("kaify-lang")?.value === "tr";
  return {
    title: isTurkish ? "Fiyatlandırma — K.AIFY" : "Pricing — K.AIFY",
    description: isTurkish
      ? "Essential, Pro veya Premium planını seç. Dört AI koç ve Kai aylık $14.99'dan başlayan fiyatlarla."
      : "Choose Essential, Pro, or Premium. Four AI coaches and Kai from $14.99/month.",
    openGraph: {
      title: isTurkish
        ? "K.AIFY Fiyatlandırma — Profesyonel Koç Ekibin"
        : "K.AIFY Pricing — Your Pro Coaching Team",
      description: isTurkish
        ? "Planları karşılaştır ve K.AIFY'ı ücretsiz indir."
        : "Compare plans and download K.AIFY free.",
    },
  };
}

export default function PricingRoute() {
  return (
    <PaddleProvider>
      <PricingPage />
    </PaddleProvider>
  );
}
