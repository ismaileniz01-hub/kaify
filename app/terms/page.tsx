import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { TermsOfServiceContent } from "@/components/legal/TermsOfServiceContent";

export const metadata = {
  title: "Terms & Conditions — Kaify",
  description: "Terms governing use of the Kaify AI fitness coaching application.",
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions">
      <TermsOfServiceContent />
    </LegalPageShell>
  );
}
