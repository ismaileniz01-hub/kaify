"use client";

import { LegalDocumentContent } from "@/components/legal/LegalDocumentContent";
import { TERMS_DOCUMENT } from "@/lib/legal/documents/terms";
import { TERMS_DOCUMENT_TR } from "@/lib/legal/documents/terms-tr";
import { useLang } from "@/lib/lang-context";

export function TermsOfServiceContent() {
  const { lang } = useLang();
  return (
    <LegalDocumentContent
      document={lang === "tr" ? TERMS_DOCUMENT_TR : TERMS_DOCUMENT}
    />
  );
}
