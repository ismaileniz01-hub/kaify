"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isWebOnlyPath, NATIVE_ENTRY_PATH } from "@/lib/native/app-entry";
import { isNativePlatform } from "@/lib/native/platform";

/**
 * Keeps the store build inside the app UI. Marketing landing (/) is web-only;
 * native users always land on the in-app home (/welcome).
 */
export function NativeAppEntry() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!(await isNativePlatform())) return;
      if (cancelled || !isWebOnlyPath(pathname)) return;
      router.replace(NATIVE_ENTRY_PATH);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
