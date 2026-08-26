"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SignupWizard } from "@/components/auth/SignupWizard";
import { AuthLoadingFallback } from "@/components/auth/AuthLoadingFallback";
import { captureReferralFromUrl } from "@/lib/referral";
import { sanitizeAuthRedirect } from "@/lib/auth/safe-redirect";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const redirectTo = sanitizeAuthRedirect(searchParams.get("next"), "/pricing");

  useEffect(() => {
    captureReferralFromUrl(searchParams);
  }, [searchParams]);

  return (
    <div className="landing-site">
      <LandingNav />
      <main>
        <SignupWizard redirectTo={redirectTo} />
      </main>
      <LandingFooter />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback destination="signup" />}>
      <SignupPageContent />
    </Suspense>
  );
}
