"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { AuthModeToggle } from "@/components/auth/AuthModeToggle";
import { EmailOtpLogin } from "@/components/auth/EmailOtpLogin";
import { useLang } from "@/lib/lang-context";
import { parseAuthMode, sanitizeAuthRedirect } from "@/lib/auth/safe-redirect";
import { captureReferralFromUrl } from "@/lib/referral";

function LoginPageContent() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const mode = parseAuthMode(searchParams.get("mode"));
  const redirectTo = sanitizeAuthRedirect(searchParams.get("next"));
  const [step, setStep] = useState<"email" | "code">("email");

  useEffect(() => {
    captureReferralFromUrl(searchParams);
  }, [searchParams]);

  // Sign-up lives on the marketing site at /signup
  useEffect(() => {
    if (mode === "signup") {
      const params = new URLSearchParams();
      if (redirectTo !== "/welcome") params.set("next", redirectTo);
      const q = params.toString();
      window.location.replace(q ? `/signup?${q}` : "/signup");
    }
  }, [mode, redirectTo]);

  if (mode === "signup") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-purple-400" />
      </div>
    );
  }

  const subtitle = t("login.subtitle");

  return (
    <div className="phone-shell login-page relative flex min-h-dvh flex-col">
      <FitnessWallpaper />

      <main className="login-page-main relative z-10 flex min-h-0 flex-1 flex-col px-6 pb-8 pt-12 sm:px-8 sm:pb-10 sm:pt-14">
        {step === "email" ? (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute h-52 w-52 rounded-full bg-purple-500/25 blur-3xl"
                  aria-hidden
                />
                <Image
                  src="/kaify-logo.png"
                  alt="K.AIFY"
                  width={220}
                  height={220}
                  className="relative h-44 w-44 object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:h-48 sm:w-48"
                  priority
                />
              </div>

              <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
                <h1 className="text-5xl font-bold leading-none tracking-[0.08em] text-white sm:text-6xl">
                  {t("login.title")}
                </h1>
                <p className="max-w-[300px] text-sm font-medium leading-snug tracking-wide text-purple-100/85 sm:text-base">
                  {subtitle}
                </p>
                <AuthModeToggle mode="signin" redirectTo={redirectTo} />
              </div>
            </div>

            <div className="mx-auto mt-8 w-full max-w-sm shrink-0">
              <EmailOtpLogin
                mode="signin"
                redirectTo={redirectTo}
                onStepChange={setStep}
              />
            </div>
          </>
        ) : (
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-4">
            <EmailOtpLogin
              mode="signin"
              redirectTo={redirectTo}
              onStepChange={setStep}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-black">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-purple-400" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
