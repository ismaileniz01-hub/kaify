"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SignupWizard } from "@/components/auth/SignupWizard";
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
    <Suspense
      fallback={
        <div className="landing-site flex min-h-dvh items-center justify-center bg-black">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-purple-400" />
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
