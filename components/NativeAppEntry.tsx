"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isWebOnlyPath, nativeFallbackForWebOnlyPath } from "@/lib/native/app-entry";
import { isNativePlatform } from "@/lib/native/platform";

/**
 * Keeps the store build inside the app UI. Marketing landing (/) is web-only;
 * native users always land on sign-in. Signup and pricing are website-only
 * under the consumption-only store policy.
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
