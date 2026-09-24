"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  hasPaidPlan,
  requiresActiveSubscription,
} from "@/lib/auth/post-auth-redirect";
import { isNativePlatform } from "@/lib/native/platform";
import { returnToNativeLoginShell } from "@/lib/native/sign-out-native";
import { useSession } from "@/lib/session-context";

/**
 * Redirects authenticated users without a paid plan away from in-app routes.
 * Native: no pricing CTA — return to the local login shell.
 */
export function SubscriptionGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, profile, signOut } = useSession();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !profile) return;
    if (!requiresActiveSubscription(pathname)) return;
    if (hasPaidPlan(profile)) return;
    void (async () => {
      const native = await isNativePlatform();
      if (native) {
        await signOut();
        await returnToNativeLoginShell();
        return;
      }
      router.replace("/pricing");
    })();
  }, [isAuthenticated, isLoading, pathname, profile, router, signOut]);

  return null;
}
