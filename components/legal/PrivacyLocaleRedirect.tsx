"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Client-only locale redirect so /privacy can stay statically generated. */
export function PrivacyLocaleRedirect() {
  const router = useRouter();
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )kaify-lang=([^;]*)/);
    const lang = match?.[1] ? decodeURIComponent(match[1]) : "";
    if (lang === "tr") router.replace("/kvkk");
  }, [router]);
  return null;
}
