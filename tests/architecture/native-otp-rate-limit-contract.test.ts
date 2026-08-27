import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ApiError } from "@/lib/api/errors";
import { fail } from "@/lib/api/response";
import {
  OTP_RESEND_AFTER_SECONDS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TARGET_HOURLY_RATE_LIMIT,
  OTP_TARGET_RATE_LIMIT,
  OTP_VERIFY_TARGET_RATE_LIMIT,
} from "@/lib/api/rate-guard";
import { NATIVE_OTP_ORIGINS, isNativeOtpOrigin } from "@/lib/native/otp-cors";
import { shouldSkipOtpCaptchaForNativeOrigin } from "@/app/api/auth/otp/send/route";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("native OTP captcha / origin contract", () => {
  it("allowlists only exact native OTP origins (no wildcards, no Origin-as-auth)", () => {
    expect(NATIVE_OTP_ORIGINS).toEqual([
      "capacitor://localhost",
      "https://localhost",
    ]);
    expect(isNativeOtpOrigin("capacitor://localhost")).toBe(true);
    expect(isNativeOtpOrigin("https://localhost")).toBe(true);
    expect(isNativeOtpOrigin("http://localhost")).toBe(false);
    expect(isNativeOtpOrigin("https://evil.example")).toBe(false);
    expect(shouldSkipOtpCaptchaForNativeOrigin("capacitor://localhost")).toBe(
      true,
    );
    expect(shouldSkipOtpCaptchaForNativeOrigin("https://kaifyai.org")).toBe(
      false,
    );
  });

  it("supports native build-20 request contract (email+locale, X-Client-Version)", () => {
    const send = source("app/api/auth/otp/send/route.ts");
    const schema = source("lib/validations/auth-otp.schema.ts");
    expect(schema).toContain("email:");
    expect(schema).toContain('locale: z.enum(["tr", "en"])');
    expect(send).toContain("shouldSkipOtpCaptchaForNativeOrigin");
    expect(send).toContain("validateRecaptcha");
    expect(send).not.toContain("RECAPTCHA_ENTERPRISE");
    expect(send).not.toContain("turnstile");
  });

  it("keeps rate-limit floors (do not loosen)", () => {
    expect(OTP_RESEND_COOLDOWN_MS).toBe(60_000);
    expect(OTP_RESEND_AFTER_SECONDS).toBe(60);
    expect(OTP_TARGET_RATE_LIMIT).toEqual({
      requests: 5,
      windowMs: 15 * 60 * 1000,
    });
    expect(OTP_TARGET_HOURLY_RATE_LIMIT).toEqual({
      requests: 5,
      windowMs: 60 * 60 * 1000,
    });
    expect(OTP_VERIFY_TARGET_RATE_LIMIT.requests).toBe(5);
  });
});

describe("OTP_RESEND_COOLDOWN Retry-After", () => {
  it("sets Retry-After header on fail()", () => {
    const res = fail(
      new ApiError("OTP_RESEND_COOLDOWN", "wait", {
        retryAfterSeconds: 60,
        retryAfterMs: 60_000,
      }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});

describe("middleware native OTP CORS + denied origins", () => {
  it("OPTIONS capacitor returns 204 + exact CORS", async () => {
    const req = new NextRequest("https://kaifyai.org/api/auth/otp/send", {
      method: "OPTIONS",
      headers: { origin: "capacitor://localhost" },
    });
    const res = await middleware(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
  });

  it("denies evil origin POST without native CORS", async () => {
    const req = new NextRequest("https://kaifyai.org/api/auth/otp/send", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        "content-type": "application/json",
      },
      body: "{}",
    });
    const res = await middleware(req);
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("GoTrue-owned OTP security (documented Kaify boundary)", () => {
  it("does not store plaintext OTP or email in Kaify rate-limit keys", () => {
    const guard = source("lib/api/rate-guard.ts");
    expect(guard).toContain("emailHash");
    expect(guard).toContain("emailHashPrefix");
    expect(guard).not.toMatch(/pub:otp_send:target:\$\{email\}/);
  });

  it("send path never logs email, OTP, or tokens", () => {
    const send = source("app/api/auth/otp/send/route.ts");
    expect(send).toContain('logger.warn("otp send failed"');
    // Only structured provider error fields — never plaintext email / code / captcha.
    expect(send).toMatch(
      /logger\.warn\("otp send failed", \{\s*code: result\.error\.code/,
    );
    expect(send).not.toMatch(/logger\.[a-z]+\([^)]*parsed\.data\.email/);
    expect(send).not.toMatch(/logger\.[a-z]+\([^)]*recaptchaToken/);
  });
});
