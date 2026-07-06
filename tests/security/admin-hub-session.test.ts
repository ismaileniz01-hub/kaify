import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  adminHubPassword,
  mintAdminHubToken,
  verifyAdminHubPassword,
  verifyAdminHubSession,
} from "@/lib/auth/admin-hub-session";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("admin-hub-session", () => {
  const originalPassword = process.env.ADMIN_HUB_PASSWORD;

  beforeEach(() => {
    process.env.ADMIN_HUB_PASSWORD = "isoisking";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00.000Z"));
  });

  afterEach(() => {
    if (originalPassword === undefined) {
      delete process.env.ADMIN_HUB_PASSWORD;
    } else {
      process.env.ADMIN_HUB_PASSWORD = originalPassword;
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("uses isoisking as default operator password", () => {
    delete process.env.ADMIN_HUB_PASSWORD;
    expect(adminHubPassword()).toBe("isoisking");
  });

  it("accepts the correct password and rejects wrong ones", () => {
    expect(verifyAdminHubPassword("isoisking")).toBe(true);
    expect(verifyAdminHubPassword("wrong")).toBe(false);
  });

  it("mints and verifies a signed hub session for the same user", async () => {
    const { cookies } = await import("next/headers");
    const userId = "388fd97b-5dda-40e0-bbed-8c9783cc7ecd";
    const token = await mintAdminHubToken(userId);

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
    } as never);

    await expect(verifyAdminHubSession(userId)).resolves.toBe(true);
    await expect(verifyAdminHubSession("other-user-id")).resolves.toBe(false);
  });

  it("rejects expired hub sessions", async () => {
    const { cookies } = await import("next/headers");
    const userId = "388fd97b-5dda-40e0-bbed-8c9783cc7ecd";
    const token = await mintAdminHubToken(userId);

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
    } as never);

    vi.setSystemTime(new Date("2026-07-07T12:00:01.000Z"));
    await expect(verifyAdminHubSession(userId)).resolves.toBe(false);
  });
});
