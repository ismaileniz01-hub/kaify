import { LegalDocumentContent } from "@/components/legal/LegalDocumentContent";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { MEDICAL_DISCLAIMER_DOCUMENT } from "@/lib/legal/documents/medical-disclaimer";
import { MEDICAL_DISCLAIMER_VERSION } from "@/lib/legal/constants";
import { publicPageMetadata } from "@/lib/seo/metadata";

export const metadata = publicPageMetadata({
  title: "Medical & Fitness Disclaimer — Kaify Ai",
  description:
    "Kaify is not a healthcare provider. Read the medical and fitness disclaimer before training.",
  path: "/disclaimer",
});

export default function MedicalDisclaimerPage() {
  return (
    <LegalPageShell
      title="Medical & Fitness Disclaimer"
      titleKey="legal.medical_disclaimer"
      subtitle={`Last updated: August 21, 2026 · Version ${MEDICAL_DISCLAIMER_VERSION}`}
    >
      <LegalDocumentContent document={MEDICAL_DISCLAIMER_DOCUMENT} />
    </LegalPageShell>
  );
}
