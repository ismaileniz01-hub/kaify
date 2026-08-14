import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { CookiePolicyContent } from "@/components/legal/CookiePolicyContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — Kaify",
};

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
