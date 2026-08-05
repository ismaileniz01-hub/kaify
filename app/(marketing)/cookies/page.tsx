import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { CookiePolicyContent } from "@/components/legal/CookiePolicyContent";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const isTurkish = (await cookies()).get("kaify-lang")?.value === "tr";
  return {
    title: isTurkish ? "Çerez Politikası — Kaify" : "Cookie Policy — Kaify",
  };
}

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      titleKey="legal.cookie_policy"
    >
      <CookiePolicyContent />
    </LegalPageShell>
  );
}
