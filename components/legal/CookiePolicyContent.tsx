"use client";

import { LegalDocumentContent } from "@/components/legal/LegalDocumentContent";
import { COOKIES_DOCUMENT } from "@/lib/legal/documents/cookies";
import { COOKIES_DOCUMENT_TR } from "@/lib/legal/documents/cookies-tr";
import { useLang } from "@/lib/lang-context";

export function CookiePolicyContent() {
  const { lang } = useLang();
  return (
    <LegalDocumentContent
      document={lang === "tr" ? COOKIES_DOCUMENT_TR : COOKIES_DOCUMENT}
    />
  );
}
