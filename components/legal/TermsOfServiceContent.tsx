import { LegalDocumentContent } from "@/components/legal/LegalDocumentContent";
import { TERMS_DOCUMENT } from "@/lib/legal/documents/terms";

export function TermsOfServiceContent() {
  return <LegalDocumentContent document={TERMS_DOCUMENT} />;
}
