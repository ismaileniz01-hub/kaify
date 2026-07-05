import { LegalDocumentContent } from "@/components/legal/LegalDocumentContent";
import { COOKIES_DOCUMENT } from "@/lib/legal/documents/cookies";

export function CookiePolicyContent() {
  return <LegalDocumentContent document={COOKIES_DOCUMENT} />;
}
