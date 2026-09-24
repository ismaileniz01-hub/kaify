"use client";

import { useCallback, useState } from "react";
import { apiPost } from "@/lib/api/client";
import { isStepUpRequiredError } from "@/components/auth/StepUpChallenge";
import { useLang } from "@/lib/lang-context";

export function useBillingPortal() {
  const { t } = useLang();
  const [portalLoading, setPortalLoading] = useState(false);
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const openPortal = useCallback(async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const { url } = await apiPost<{ url: string }>("/api/billing/portal", {});
      const { isNativePlatform } = await import("@/lib/native/platform");
      if (await isNativePlatform()) {
        // Store policy: do not open external billing CTAs from the installed app.
        setPortalError(t("myaccount.billing_on_website"));
        return;
      }
      window.location.assign(url);
    } catch (err) {
      if (isStepUpRequiredError(err)) {
        setNeedsStepUp(true);
      } else {
        setPortalError(t("myaccount.portal_error"));
      }
    } finally {
      setPortalLoading(false);
    }
  }, [portalLoading, t]);

  return {
    openPortal,
    portalLoading,
    needsStepUp,
    setNeedsStepUp,
    portalError,
  };
}
