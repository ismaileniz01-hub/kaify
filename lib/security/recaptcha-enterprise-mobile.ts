import { logger } from "@/lib/logger";
import {
  RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
  RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY,
  RECAPTCHA_ENTERPRISE_IOS_BUNDLE_ID_DEFAULT,
} from "@/lib/security/recaptcha-enterprise-constants";

export {
  RECAPTCHA_ENTERPRISE_ACTION_OTP_SEND,
  RECAPTCHA_ENTERPRISE_ACTION_OTP_VERIFY,
  RECAPTCHA_ENTERPRISE_IOS_BUNDLE_ID_DEFAULT,
};

export type RecaptchaEnterpriseAssessmentResponse = {
  name?: string;
  event?: { expectedAction?: string; siteKey?: string };
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
    action?: string;
    createTime?: string;
    hostname?: string;
    androidPackageName?: string;
    iosBundleId?: string;
  };
  riskAnalysis?: {
    score?: number;
    reasons?: string[];
  };
};

export type RecaptchaEnterpriseDecision = {
  ok: boolean;
  reason?:
    | "missing_config"
    | "missing_token"
    | "provider_failure"
    | "invalid_token"
    | "wrong_action"
    | "wrong_bundle"
    | "low_score"
    | "malformed";
  score?: number;
};

export function recaptchaEnterpriseProjectId(): string | null {
  const id = process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID?.trim();
  return id || null;
}

export function recaptchaEnterpriseIosSiteKey(): string | null {
  const key =
    process.env.RECAPTCHA_ENTERPRISE_IOS_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_IOS_SITE_KEY?.trim();
  if (!key || key.includes("YOUR_") || key.includes("your_")) return null;
  return key;
}

export function recaptchaEnterpriseApiKey(): string | null {
  const key = process.env.RECAPTCHA_ENTERPRISE_API_KEY?.trim();
  if (!key || key.includes("YOUR_") || key.includes("your_")) return null;
  return key;
}

export function recaptchaEnterpriseMinScore(): number {
  const raw = process.env.RECAPTCHA_ENTERPRISE_MIN_SCORE?.trim();
  if (!raw) return 0.5;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.5;
  return n;
}

export function recaptchaEnterpriseIosBundleId(): string {
  return (
    process.env.RECAPTCHA_ENTERPRISE_IOS_BUNDLE_ID?.trim() ||
    RECAPTCHA_ENTERPRISE_IOS_BUNDLE_ID_DEFAULT
  );
}

export function isRecaptchaEnterpriseMobileConfigured(): boolean {
  return Boolean(
    recaptchaEnterpriseProjectId() &&
      recaptchaEnterpriseIosSiteKey() &&
      recaptchaEnterpriseApiKey(),
  );
}

/**
 * Pure evaluation of an Enterprise assessment payload for iOS mobile OTP.
 * Does not trust Origin headers — only assessment fields + expectedAction.
 */
export function evaluateRecaptchaEnterpriseMobileAssessment(
  data: RecaptchaEnterpriseAssessmentResponse,
  expectedAction: string,
  opts?: { bundleId?: string; minScore?: number },
): RecaptchaEnterpriseDecision {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "malformed" };
  }

  const props = data.tokenProperties;
  if (!props || props.valid !== true) {
    return { ok: false, reason: "invalid_token" };
  }

  if (typeof props.action !== "string" || props.action !== expectedAction) {
    return { ok: false, reason: "wrong_action" };
  }

  const expectedBundle = opts?.bundleId ?? recaptchaEnterpriseIosBundleId();
  if (
    typeof props.iosBundleId === "string" &&
    props.iosBundleId.length > 0 &&
    props.iosBundleId !== expectedBundle
  ) {
    return { ok: false, reason: "wrong_bundle" };
  }

  const score = data.riskAnalysis?.score;
  const minScore = opts?.minScore ?? recaptchaEnterpriseMinScore();
  if (typeof score === "number") {
    if (!Number.isFinite(score) || score < minScore) {
      return { ok: false, reason: "low_score", score };
    }
  }

  return { ok: true, score: typeof score === "number" ? score : undefined };
}

export async function createRecaptchaEnterpriseAssessment(params: {
  token: string;
  siteKey: string;
  expectedAction: string;
  userAgent?: string | null;
  userIpAddress?: string | null;
}): Promise<RecaptchaEnterpriseAssessmentResponse | null> {
  const projectId = recaptchaEnterpriseProjectId();
  const apiKey = recaptchaEnterpriseApiKey();
  if (!projectId || !apiKey) {
    return null;
  }

  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/assessments?key=${encodeURIComponent(apiKey)}`;

  const event: Record<string, string> = {
    token: params.token,
    siteKey: params.siteKey,
    expectedAction: params.expectedAction,
  };
  if (params.userAgent) event.userAgent = params.userAgent;
  if (params.userIpAddress) event.userIpAddress = params.userIpAddress;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  });

  if (!response.ok) {
    logger.warn("[security] reCAPTCHA Enterprise assessment HTTP failure", {
      status: response.status,
    });
    return null;
  }

  return (await response.json()) as RecaptchaEnterpriseAssessmentResponse;
}

/**
 * Validate an iOS Enterprise mobile token for a specific OTP action.
 * Separate from web v2 siteverify — never mixed.
 */
export async function validateRecaptchaEnterpriseMobileToken(params: {
  token: string;
  expectedAction: string;
  userAgent?: string | null;
  userIpAddress?: string | null;
}): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isRecaptchaEnterpriseMobileConfigured()) {
    if (isProduction) {
      logger.error(
        "[security] reCAPTCHA Enterprise mobile is not configured in production",
      );
      return false;
    }
    logger.warn(
      "[security] reCAPTCHA Enterprise mobile not configured — skipping (non-production)",
    );
    return true;
  }

  if (!params.token || params.token.length < 20) {
    return false;
  }

  const siteKey = recaptchaEnterpriseIosSiteKey()!;

  try {
    const assessment = await createRecaptchaEnterpriseAssessment({
      token: params.token,
      siteKey,
      expectedAction: params.expectedAction,
      userAgent: params.userAgent,
      userIpAddress: params.userIpAddress,
    });

    if (!assessment) {
      return false;
    }

    const decision = evaluateRecaptchaEnterpriseMobileAssessment(
      assessment,
      params.expectedAction,
    );
    if (!decision.ok) {
      logger.warn("[security] reCAPTCHA Enterprise mobile rejected", {
        reason: decision.reason,
        expectedAction: params.expectedAction,
      });
    }
    return decision.ok;
  } catch (error) {
    logger.error("[security] reCAPTCHA Enterprise mobile validation error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
