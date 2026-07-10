"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  hasActiveSubscription,
  requiresActiveSubscription,
} from "@/lib/auth/post-auth-redirect";
import { useSession } from "@/lib/session-context";

/**
 * Redirects authenticated users without a paid plan away from in-app routes.
 */
export function SubscriptionGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, profile } = useSession();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !profile) return;
    if (!requiresActiveSubscription(pathname)) return;
    if (hasActiveSubscription(profile.tier)) return;
    router.replace("/pricing");
  }, [isAuthenticated, isLoading, pathname, profile, router]);

  return null;
}
