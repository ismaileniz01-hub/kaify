import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { TermsOfServiceContent } from "@/components/legal/TermsOfServiceContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Kaify",
  description: "Terms governing use of the Kaify AI fitness coaching application.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions" titleKey="legal.terms">
      <TermsOfServiceContent />
    </LegalPageShell>
  );
}
