import { Capacitor, CapacitorException } from "@capacitor/core";
import { KaifyRecaptchaEnterprise } from "kaify-recaptcha-enterprise";
import {
  RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
  RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY,
} from "@/lib/security/recaptcha-enterprise-constants";

function iosSiteKey(): string | null {
  const key = String(__RECAPTCHA_ENTERPRISE_IOS_SITE_KEY__ || "").trim();
  if (!key || key.includes("YOUR_") || key.includes("your_")) return null;
  return key;
}

function mapPluginError(error: unknown): string {
  if (error instanceof CapacitorException) {
    const code = (error as { code?: string }).code || "";
    const message = error.message || "";
    if (code === "network_error" || /network|connection|offline/i.test(message)) {
      return "Could not reach security verification. Check your connection and try again.";
    }
    if (/timeout|timed out/i.test(message)) {
      return "Security verification timed out. Please try again.";
    }
    if (message) return message;
  }
  if (error instanceof Error && error.message) {
    if (/timeout|timed out/i.test(error.message)) {
      return "Security verification timed out. Please try again.";
    }
    if (/network|connection|offline/i.test(error.message)) {
      return "Could not reach security verification. Check your connection and try again.";
    }
    return error.message;
  }
  return "Security verification failed. Please try again.";
}

/**
 * Execute reCAPTCHA Enterprise iOS SDK for an OTP action.
 * Android / web: returns a controlled error (Android not implemented yet).
 */
export async function executeNativeRecaptchaEnterprise(
  action:
    | typeof RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND
    | typeof RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY,
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  if (Capacitor.getPlatform() !== "ios") {
    return {
      ok: false,
      message: "Secure sign-in on this platform is not available yet.",
    };
  }

  const siteKey = iosSiteKey();
  if (!siteKey) {
    return {
      ok: false,
      message: "Secure sign-in is not configured. Please update the app.",
    };
  }

  try {
    const result = await KaifyRecaptchaEnterprise.execute({
      siteKey,
      action,
      timeoutMs: 12_000,
    });
    const token = result.token?.trim();
    if (!token || token.length < 20) {
      return {
        ok: false,
        message: "Security verification failed. Please try again.",
      };
    }
    return { ok: true, token };
  } catch (error) {
    return { ok: false, message: mapPluginError(error) };
  }
}

export {
  RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
  RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY,
};
