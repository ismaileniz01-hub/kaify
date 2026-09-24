"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isWebOnlyPath, nativeFallbackForWebOnlyPath } from "@/lib/native/app-entry";
import { isNativePlatform } from "@/lib/native/platform";

/**
 * Development fallback for the shared Next.js UI. Store builds use the local
 * native bundle for sign-in; checkout and signup remain website-only.
 */
export function NativeAppEntry() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!(await isNativePlatform())) return;
      if (cancelled || !isWebOnlyPath(pathname)) return;
      router.replace(nativeFallbackForWebOnlyPath(pathname));
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
