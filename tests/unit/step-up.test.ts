import { describe, expect, it } from "vitest";
import {
  mintStepUpToken,
  verifyStepUpToken,
  STEP_UP_TTL_MS,
} from "@/lib/auth/step-up";

describe("step-up token", () => {
  it("mints and verifies a bound user token", () => {
    const token = mintStepUpToken("user-1");
    expect(verifyStepUpToken(token, "user-1")).toBe(true);
    expect(verifyStepUpToken(token, "user-2")).toBe(false);
  });

  it("rejects expired tokens", () => {
    const now = Date.now();
    const token = mintStepUpToken("user-1", now - STEP_UP_TTL_MS - 1_000);
    expect(verifyStepUpToken(token, "user-1", now)).toBe(false);
  });

  it("rejects tampered signatures", () => {
    const token = mintStepUpToken("user-1");
    const [uid, exp] = token.split(".");
    expect(verifyStepUpToken(`${uid}.${exp}.deadbeef`, "user-1")).toBe(false);
  });
});
