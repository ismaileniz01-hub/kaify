import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import {
  checkDisposableEmail,
  getClientIP,
  hashEmail,
  isAllowedOrigin,
  isLikelyBot,
} from "@/lib/api-security";

/** Minimal NextRequest stand-in exposing only what these helpers read. */
function fakeRequest(
  headers: Record<string, string>,
  method = "GET",
): NextRequest {
  return {
    method,
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getClientIP", () => {
  it("prefers Cloudflare connecting IP when cf-ray present", () => {
    const req = fakeRequest({
      "cf-ray": "abc",
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("trusts only x-real-ip on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    const req = fakeRequest({
      "x-real-ip": "5.6.7.8",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(getClientIP(req)).toBe("5.6.7.8");
  });

  it("falls back to x-forwarded-for off-Vercel", () => {
    vi.stubEnv("VERCEL", "");
    const req = fakeRequest({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" });
    expect(getClientIP(req)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when no ip headers exist", () => {
    vi.stubEnv("VERCEL", "");
    expect(getClientIP(fakeRequest({}))).toBe("unknown");
  });
});

describe("isLikelyBot", () => {
  it("flags empty or too-short user agents", () => {
    expect(isLikelyBot(fakeRequest({}))).toBe(true);
    expect(isLikelyBot(fakeRequest({ "user-agent": "abc" }))).toBe(true);
  });

  it("flags known bot signatures", () => {
    expect(isLikelyBot(fakeRequest({ "user-agent": "curl/8.0.1" }))).toBe(true);
    expect(
      isLikelyBot(fakeRequest({ "user-agent": "python-requests/2.31" })),
    ).toBe(true);
  });

  it("allows a normal browser UA", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
    expect(isLikelyBot(fakeRequest({ "user-agent": ua }))).toBe(false);
  });
});

describe("isAllowedOrigin", () => {
  it("allows a whitelisted origin", () => {
    const req = fakeRequest({ origin: "https://kaify.org" }, "POST");
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("rejects an unknown origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = fakeRequest({ origin: "https://evil.example" }, "POST");
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("accepts a whitelisted referer when origin is absent", () => {
    const req = fakeRequest({ referer: "https://www.kaify.org/welcome" }, "POST");
    expect(isAllowedOrigin(req)).toBe(true);
  });
});

describe("checkDisposableEmail", () => {
  it("flags a known disposable domain", () => {
    const result = checkDisposableEmail("spammer@mailinator.com");
    expect(result.isDisposable).toBe(true);
    expect(result.risk).not.toBe("none");
  });

  it("allows a normal domain", () => {
    const result = checkDisposableEmail("real.user@gmail.com");
    expect(result.isDisposable).toBe(false);
    expect(result.risk).toBe("none");
  });
});

describe("hashEmail", () => {
  it("is deterministic and case/whitespace insensitive", async () => {
    const a = await hashEmail("User@Example.com");
    const b = await hashEmail("  user@example.com  ");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different emails", async () => {
    const a = await hashEmail("a@example.com");
    const b = await hashEmail("b@example.com");
    expect(a).not.toBe(b);
  });
});
