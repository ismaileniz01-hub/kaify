"use client";

import { LegalDocumentContent } from "@/components/legal/LegalDocumentContent";
import { REFUND_DOCUMENT } from "@/lib/legal/documents/refund";
import { REFUND_DOCUMENT_TR } from "@/lib/legal/documents/refund-tr";
import { useLang } from "@/lib/lang-context";

export function RefundPolicyContent() {
  const { lang } = useLang();
  return <LegalDocumentContent document={lang === "tr" ? REFUND_DOCUMENT_TR : REFUND_DOCUMENT} />;
}
