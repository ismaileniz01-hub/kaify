"use client";

import { useRef, type RefObject } from "react";
import ReCAPTCHA from "react-google-recaptcha";

function siteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
  if (!key || key.includes("YOUR_") || key.includes("your_")) return null;
  return key;
}

/** Invisible reCAPTCHA widget — render once near OTP send controls. */
export function InvisibleRecaptcha({
  captchaRef,
}: {
  captchaRef: RefObject<ReCAPTCHA | null>;
}) {
  const key = siteKey();
  if (!key) return null;
  return <ReCAPTCHA ref={captchaRef} sitekey={key} size="invisible" />;
}

export function useInvisibleRecaptchaRef() {
  return useRef<ReCAPTCHA | null>(null);
}

/** Execute invisible challenge; returns undefined when site key is unset (dev). */
export async function executeInvisibleRecaptcha(
  captchaRef: RefObject<ReCAPTCHA | null>,
): Promise<string | undefined> {
  const key = siteKey();
  if (!key) return undefined;
  try {
    const token = await captchaRef.current?.executeAsync();
    captchaRef.current?.reset();
    return token ?? undefined;
  } catch {
    captchaRef.current?.reset();
    return undefined;
  }
}
