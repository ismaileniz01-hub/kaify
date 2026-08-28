"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { AuthModeToggle } from "@/components/auth/AuthModeToggle";
import { EmailOtpLogin } from "@/components/auth/EmailOtpLogin";
import { useLang } from "@/lib/lang-context";
import type { AuthMode } from "@/lib/auth/safe-redirect";
import { captureReferralFromUrl } from "@/lib/referral";
import { useNativeApp } from "@/lib/native/platform";

type LoginPageContentProps = {
  mode: AuthMode;
  redirectTo: string;
};

export function LoginPageContent({ mode, redirectTo }: LoginPageContentProps) {
  const { t } = useLang();
  const native = useNativeApp();
  const [step, setStep] = useState<"email" | "code">("email");

  useEffect(() => {
    captureReferralFromUrl(window.location.search);
  }, []);

  useEffect(() => {
    if (mode !== "signup" || native === true || native === null) return;
    const params = new URLSearchParams();
    if (redirectTo !== "/welcome") params.set("next", redirectTo);
    const q = params.toString();
    window.location.replace(q ? `/signup?${q}` : "/signup");
  }, [mode, native, redirectTo]);

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
                  alt="Kaify Ai"
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
