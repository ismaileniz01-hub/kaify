import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { TermsOfServiceContent } from "@/components/legal/TermsOfServiceContent";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const isTurkish = (await cookies()).get("kaify-lang")?.value === "tr";
  return {
    title: isTurkish ? "Şartlar ve Koşullar — Kaify" : "Terms & Conditions — Kaify",
    description: isTurkish
      ? "Kaify AI fitness koçluğu uygulamasının kullanım koşulları."
      : "Terms governing use of the Kaify AI fitness coaching application.",
  };
}

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions" titleKey="legal.terms">
      <TermsOfServiceContent />
    </LegalPageShell>
  );
}
