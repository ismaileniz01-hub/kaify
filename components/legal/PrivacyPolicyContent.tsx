"use client";

import { LegalDocumentContent } from "@/components/legal/LegalDocumentContent";
import { PRIVACY_DOCUMENT } from "@/lib/legal/documents/privacy";

/** Canonical global Privacy Policy (English primary). */
export function PrivacyPolicyContent() {
  return <LegalDocumentContent document={PRIVACY_DOCUMENT} />;
}
