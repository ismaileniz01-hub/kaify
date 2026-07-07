"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FitnessWallpaper } from "@/components/FitnessWallpaper";
import { EmailOtpLogin } from "@/components/auth/EmailOtpLogin";
import { useLang } from "@/lib/lang-context";
import { captureReferralFromUrl } from "@/lib/referral";

export default function LoginPage() {
  const { t } = useLang();
  const [step, setStep] = useState<"email" | "code">("email");

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

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

              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-5xl font-bold leading-none tracking-[0.08em] text-white sm:text-6xl">
                  {t("login.title")}
                </h1>
                <p className="max-w-[300px] text-sm font-medium leading-snug tracking-wide text-purple-100/85 sm:text-base">
                  {t("login.subtitle")}
                </p>
              </div>
            </div>

            <div className="mt-8 shrink-0">
              <EmailOtpLogin onStepChange={setStep} />
            </div>
          </>
        ) : (
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-4">
            <EmailOtpLogin onStepChange={setStep} />
          </div>
        )}
      </main>
    </div>
  );
}
