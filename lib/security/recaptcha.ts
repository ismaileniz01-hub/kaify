import { logger } from "@/lib/logger";

/**
 * Kaify Ai uses react-google-recaptcha `size="invisible"` (reCAPTCHA v2 Invisible).
 * siteverify may still include v3 fields (`score`, `action`) if the key is v3.
 * Thresholds are explicit env config — never a silent default in production logs.
 */
export const RECAPTCHA_MAX_CHALLENGE_AGE_MS = 2 * 60 * 1000;

export function recaptchaMinScore(): number {
  const raw = process.env.RECAPTCHA_MIN_SCORE?.trim();
  if (!raw) return 0.5;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.5;
  return n;
}

export function recaptchaExpectedAction(): string | null {
  const action = process.env.RECAPTCHA_EXPECTED_ACTION?.trim();
  return action || null;
}

export function recaptchaExpectedHostnames(): string[] {
  const extra = (process.env.RECAPTCHA_EXPECTED_HOSTNAMES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const hosts = new Set<string>([
    "kaify.org",
    "www.kaify.org",
    "kaifyai.org",
    "www.kaifyai.org",
    ...extra,
  ]);

  const vercel = process.env.VERCEL_URL?.replace(/^https?:\/\//, "").toLowerCase();
  if (vercel) hosts.add(vercel);

  const isProd =
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview";
  if (!isProd) {
    hosts.add("localhost");
    hosts.add("127.0.0.1");
  }

  return [...hosts];
}

export type RecaptchaSiteverify = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

export type RecaptchaDecision = {
  ok: boolean;
  reason?:
    | "missing_secret"
    | "provider_failure"
    | "unsuccessful"
    | "low_score"
    | "wrong_action"
    | "wrong_hostname"
    | "expired"
    | "malformed";
};

export function evaluateRecaptchaResponse(
  data: RecaptchaSiteverify,
  now = Date.now(),
): RecaptchaDecision {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "malformed" };
  }
  if (data.success !== true) {
    return { ok: false, reason: "unsuccessful" };
  }

  if (typeof data.hostname === "string" && data.hostname.length > 0) {
    const host = data.hostname.toLowerCase();
    if (!recaptchaExpectedHostnames().includes(host)) {
      return { ok: false, reason: "wrong_hostname" };
    }
  }

  if (typeof data.score === "number") {
    if (!Number.isFinite(data.score) || data.score < recaptchaMinScore()) {
      return { ok: false, reason: "low_score" };
    }
  }

  const expectedAction = recaptchaExpectedAction();
  if (expectedAction && typeof data.action === "string") {
    if (data.action !== expectedAction) {
      return { ok: false, reason: "wrong_action" };
    }
  }

  if (typeof data.challenge_ts === "string" && data.challenge_ts.length > 0) {
    const ts = Date.parse(data.challenge_ts);
    if (!Number.isFinite(ts)) {
      return { ok: false, reason: "malformed" };
    }
    if (now - ts > RECAPTCHA_MAX_CHALLENGE_AGE_MS || ts - now > 30_000) {
      return { ok: false, reason: "expired" };
    }
  }

  return { ok: true };
}

export async function validateRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secretKey || secretKey.includes("your_") || secretKey.includes("_here")) {
    if (isProduction) {
      logger.error("[security] RECAPTCHA_SECRET_KEY is missing in production");
      return false;
    }
    logger.warn("[security] RECAPTCHA_SECRET_KEY is not configured — skipping validation");
    return true;
  }

  if (!token || token.length < 8) {
    return false;
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
      },
    );

    if (!response.ok) {
      logger.warn("[security] reCAPTCHA provider HTTP failure", {
        status: response.status,
      });
      return false;
    }

    const data = (await response.json()) as RecaptchaSiteverify;
    const decision = evaluateRecaptchaResponse(data);
    if (!decision.ok) {
      logger.warn("[security] reCAPTCHA rejected", { reason: decision.reason });
    }
    return decision.ok;
  } catch (error) {
    logger.error("[security] reCAPTCHA validation error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
