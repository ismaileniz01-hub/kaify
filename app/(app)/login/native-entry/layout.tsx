import type { ReactNode } from "react";
import { headers } from "next/headers";
import { NATIVE_ENTRY_BOOT_SCRIPT } from "@/lib/native/native-entry-boot";

/**
 * Boot script lives in the layout so it ships with a CSP nonce even if the
 * page body streams later. Do not add loading.tsx here — that UI had no script.
 */
export default async function NativeEntryLayout({
  children,
}: {
  children: ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <>
      {children}
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: NATIVE_ENTRY_BOOT_SCRIPT }}
      />
    </>
  );
}
