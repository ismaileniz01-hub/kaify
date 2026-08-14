import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { TermsOfServiceContent } from "@/components/legal/TermsOfServiceContent";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Terms & Conditions — K.AIFY",
  description: "Terms governing use of the Kaify AI fitness coaching application.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions" titleKey="legal.terms">
      <TermsOfServiceContent />
    </LegalPageShell>
  );
}
