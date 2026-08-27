import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeResendAvailableAt,
  formatResendCountdown,
  remainingResendSeconds,
  resendButtonLabel,
} from "../../native-app/src/otp-resend-timer";

describe("native OTP resend timer helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down 60 → 0 from absolute timestamp (not interval-only)", () => {
    const at = computeResendAvailableAt(60);
    expect(remainingResendSeconds(at)).toBe(60);
    expect(resendButtonLabel(60)).toBe("Kodu tekrar gönder (01:00)");
    expect(formatResendCountdown(59)).toBe("00:59");

    vi.advanceTimersByTime(30_000);
    expect(remainingResendSeconds(at)).toBe(30);

    vi.advanceTimersByTime(30_000);
    expect(remainingResendSeconds(at)).toBe(0);
    expect(resendButtonLabel(0)).toBe("Kodu tekrar gönder");
  });

  it("survives background/foreground by recomputing from timestamp", () => {
    const at = computeResendAvailableAt(60);
    vi.advanceTimersByTime(20_000);
    // Simulate app background for 25s without local interval ticks.
    vi.advanceTimersByTime(25_000);
    expect(remainingResendSeconds(at)).toBe(15);
  });

  it("applies server Retry-After remaining seconds", () => {
    const at = computeResendAvailableAt(45);
    expect(remainingResendSeconds(at)).toBe(45);
    expect(resendButtonLabel(45)).toBe("Kodu tekrar gönder (00:45)");
  });

  it("restarts at 60 after a successful new send timestamp", () => {
    const first = computeResendAvailableAt(60);
    vi.advanceTimersByTime(40_000);
    expect(remainingResendSeconds(first)).toBe(20);
    const second = computeResendAvailableAt(60);
    expect(remainingResendSeconds(second)).toBe(60);
  });
});
