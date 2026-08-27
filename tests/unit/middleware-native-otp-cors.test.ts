import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  applyNativeOtpCorsHeaders,
  isNativeOtpOrigin,
  isNativeOtpPath,
  isNativeOtpRequest,
  NATIVE_OTP_ORIGINS,
} from "@/lib/native/otp-cors";
import { NextResponse } from "next/server";
import { middleware } from "@/middleware";

function otpRequest(
  path: "/api/auth/otp/send" | "/api/auth/otp/verify",
  init: {
    method?: string;
    origin?: string;
    userAgent?: string;
    body?: string;
  } = {},
) {
  const headers = new Headers();
  if (init.origin) headers.set("origin", init.origin);
  if (init.userAgent !== undefined) headers.set("user-agent", init.userAgent);
  if (init.body) headers.set("content-type", "application/json");
  return new NextRequest(`https://kaifyai.org${path}`, {
    method: init.method ?? "POST",
    headers,
    body: init.body,
  });
}

describe("native OTP CORS helpers", () => {
  it("allowlists only exact Capacitor origins (no wildcards)", () => {
    expect(NATIVE_OTP_ORIGINS).toEqual([
      "capacitor://localhost",
      "https://localhost",
    ]);
    expect(isNativeOtpOrigin("capacitor://localhost")).toBe(true);
    expect(isNativeOtpOrigin("https://localhost")).toBe(true);
    expect(isNativeOtpOrigin("http://localhost")).toBe(false);
    expect(isNativeOtpOrigin("https://evil.example")).toBe(false);
    expect(isNativeOtpOrigin(null)).toBe(false);
  });

  it("matches only OTP send/verify paths", () => {
    expect(isNativeOtpPath("/api/auth/otp/send")).toBe(true);
    expect(isNativeOtpPath("/api/auth/otp/verify")).toBe(true);
    expect(isNativeOtpPath("/api/auth/password")).toBe(false);
    expect(isNativeOtpPath("/api/v1/profile")).toBe(false);
  });

  it("applies exact ACAO + credentials + Vary", () => {
    const req = otpRequest("/api/auth/otp/send", {
      origin: "capacitor://localhost",
      method: "OPTIONS",
    });
    const res = applyNativeOtpCorsHeaders(req, new NextResponse(null, { status: 204 }));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(res.headers.get("Vary")).toContain("Origin");
  });
});

describe("middleware native OTP CORS", () => {
  it("OPTIONS /api/auth/otp/send returns 204 with exact capacitor CORS", async () => {
    const res = await middleware(
      otpRequest("/api/auth/otp/send", {
        method: "OPTIONS",
        origin: "capacitor://localhost",
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("OPTIONS /api/auth/otp/verify returns 204 with https://localhost CORS", async () => {
    const res = await middleware(
      otpRequest("/api/auth/otp/verify", {
        method: "OPTIONS",
        origin: "https://localhost",
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://localhost",
    );
  });

  it("POST send with short UA is not bot-403 for capacitor origin", async () => {
    const res = await middleware(
      otpRequest("/api/auth/otp/send", {
        method: "POST",
        origin: "capacitor://localhost",
        userAgent: "x",
        body: "{}",
      }),
    );
    expect(res.status).not.toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("POST verify with missing UA is not bot-403 for https://localhost", async () => {
    const res = await middleware(
      otpRequest("/api/auth/otp/verify", {
        method: "POST",
        origin: "https://localhost",
        userAgent: "",
        body: "{}",
      }),
    );
    expect(res.status).not.toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://localhost",
    );
  });

  it("POST send from evil origin still denied without native CORS", async () => {
    const res = await middleware(
      otpRequest("/api/auth/otp/send", {
        method: "POST",
        origin: "https://evil.example",
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        body: "{}",
      }),
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("isNativeOtpRequest gates path+origin together", () => {
    const ok = otpRequest("/api/auth/otp/send", {
      origin: "capacitor://localhost",
    });
    expect(isNativeOtpRequest(ok, "/api/auth/otp/send")).toBe(true);
    expect(isNativeOtpRequest(ok, "/api/auth/password")).toBe(false);
  });
});
