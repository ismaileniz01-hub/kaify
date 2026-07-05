"use client";

import Script from "next/script";
import type { HTMLAttributes } from "react";
import { PRIVACY_TERMLY_DATA_ID, PRIVACY_EMAIL, PRIVACY_VERSION } from "@/lib/legal/constants";

type TermlyPrivacyEmbedProps = {
  nonce?: string;
};

export function TermlyPrivacyEmbed({ nonce }: TermlyPrivacyEmbedProps) {
  if (!PRIVACY_TERMLY_DATA_ID) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p>
          Privacy Policy embed is not configured yet. Set{" "}
          <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_TERMLY_PRIVACY_DATA_ID</code>{" "}
          in production, or contact{" "}
          <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          .
        </p>
        <p className="mt-2 text-zinc-400">Document version: {PRIVACY_VERSION}</p>
      </div>
    );
  }

  return (
    <>
      <div
        {...({
          name: "termly-embed",
          "data-id": PRIVACY_TERMLY_DATA_ID,
        } as HTMLAttributes<HTMLDivElement> & { name: string; "data-id": string })}
      />
      <Script
        src="https://app.termly.io/embed-policy.min.js"
        strategy="afterInteractive"
        nonce={nonce}
      />
    </>
  );
}
