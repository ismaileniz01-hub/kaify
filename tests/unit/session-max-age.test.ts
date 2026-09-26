import { describe, expect, it } from "vitest";
import {
  SESSION_MAX_AGE_MS,
  isLoginWithinMaxAge,
  isSessionPastMaxAge,
  sessionAuthenticatedAtMs,
} from "@/lib/auth/session-max-age";

const DAY_MS = 24 * 60 * 60 * 1000;

function jwt(payload: object): string {
  const b64 = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.sig`;
}

describe("35-day sign-in window", () => {
  const now = Date.UTC(2026, 8, 26);

  it("reads the earliest amr timestamp as the sign-in time", () => {
    const token = jwt({
      amr: [
        { method: "totp", timestamp: now / 1000 - 60 },
        { method: "otp", timestamp: now / 1000 - 3600 },
      ],
    });
    expect(sessionAuthenticatedAtMs(token)).toBe(now - 3600 * 1000);
  });

  it("rejects sessions older than 35 days and keeps younger ones", () => {
    const young = jwt({ amr: [{ method: "otp", timestamp: (now - 34 * DAY_MS) / 1000 }] });
    const old = jwt({ amr: [{ method: "otp", timestamp: (now - 36 * DAY_MS) / 1000 }] });
    expect(isSessionPastMaxAge(young, now)).toBe(false);
    expect(isSessionPastMaxAge(old, now)).toBe(true);
  });

  it("does not reject tokens without amr claims", () => {
    expect(isSessionPastMaxAge(jwt({ sub: "u1" }), now)).toBe(false);
    expect(isSessionPastMaxAge("garbage", now)).toBe(false);
  });

  it("gates native cold-start resume on the stored login time", () => {
    expect(isLoginWithinMaxAge(now - SESSION_MAX_AGE_MS + DAY_MS, now)).toBe(true);
    expect(isLoginWithinMaxAge(now - SESSION_MAX_AGE_MS - 1, now)).toBe(false);
    expect(isLoginWithinMaxAge(null, now)).toBe(false);
    expect(isLoginWithinMaxAge(now + DAY_MS, now)).toBe(false);
  });
});
