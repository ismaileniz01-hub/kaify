import type { NextRequest } from "next/server";
import { getClientIP } from "@/lib/api-security";
import {
  RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
  RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY,
  RECAPTCHA_ENTERPRISE_TOKEN_HEADER,
} from "@/lib/security/recaptcha-enterprise-constants";
import {
  isRecaptchaEnterpriseMobileConfigured,
  validateRecaptchaEnterpriseMobileToken,
} from "@/lib/security/recaptcha-enterprise-mobile";
import { validateRecaptcha } from "@/lib/security/recaptcha";

export { RECAPTCHA_ENTERPRISE_TOKEN_HEADER };
/**
 * Prefer explicit body field; fall back to dedicated header.
 * Never inferred from Origin.
 */
export function extractRecaptchaEnterpriseToken(
  request: Request,
  bodyToken?: string | null,
): string | null {
  const fromBody = bodyToken?.trim();
  if (fromBody && fromBody.length >= 20) return fromBody;

  const fromHeader = request.headers
    .get(RECAPTCHA_ENTERPRISE_TOKEN_HEADER)
    ?.trim();
  if (fromHeader && fromHeader.length >= 20) return fromHeader;

  return null;
}

function clientIp(request: Request): string | null {
  try {
    return getClientIP(request as NextRequest);
  } catch {
    return (
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      null
    );
  }
}

/**
 * OTP captcha gate:
 * - Native Enterprise token → Enterprise assessment only (ios).
 * - Else → existing web v2 siteverify path (unchanged).
 * Paths are never mixed: an Enterprise token is not sent to siteverify.
 */
export async function validateOtpCaptcha(params: {
  request: Request;
  recaptchaToken?: string | null;
  recaptchaEnterpriseToken?: string | null;
  recaptchaPlatform?: "ios" | null;
  expectedEnterpriseAction:
    | typeof RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND
    | typeof RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY;
}): Promise<boolean> {
  const enterpriseToken = extractRecaptchaEnterpriseToken(
    params.request,
    params.recaptchaEnterpriseToken,
  );

  if (enterpriseToken) {
    // Platform must be explicit ios when using Enterprise mobile tokens.
    if (params.recaptchaPlatform && params.recaptchaPlatform !== "ios") {
      return false;
    }
    if (
      process.env.NODE_ENV === "production" &&
      !isRecaptchaEnterpriseMobileConfigured()
    ) {
      return false;
    }
    return validateRecaptchaEnterpriseMobileToken({
      token: enterpriseToken,
      expectedAction: params.expectedEnterpriseAction,
      userAgent: params.request.headers.get("user-agent"),
      userIpAddress: clientIp(params.request),
    });
  }

  return validateRecaptcha(params.recaptchaToken ?? "");
}