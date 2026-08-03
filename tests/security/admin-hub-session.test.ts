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
  const originalCsrf = process.env.CSRF_SECRET;
  const originalHubSecret = process.env.ADMIN_HUB_SECRET;

  beforeEach(() => {
    process.env.ADMIN_HUB_PASSWORD = "test-hub-password";
    process.env.CSRF_SECRET = "test-csrf-secret-key";
    process.env.ADMIN_HUB_SECRET = "test-admin-hub-secret-key";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00.000Z"));
  });

  afterEach(() => {
    if (originalPassword === undefined) delete process.env.ADMIN_HUB_PASSWORD;
    else process.env.ADMIN_HUB_PASSWORD = originalPassword;
    if (originalCsrf === undefined) delete process.env.CSRF_SECRET;
    else process.env.CSRF_SECRET = originalCsrf;
    if (originalHubSecret === undefined) delete process.env.ADMIN_HUB_SECRET;
    else process.env.ADMIN_HUB_SECRET = originalHubSecret;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns null when ADMIN_HUB_PASSWORD is unset (no hardcoded default)", () => {
    delete process.env.ADMIN_HUB_PASSWORD;
    expect(adminHubPassword()).toBeNull();
    expect(verifyAdminHubPassword("isoisking")).toBe(false);
  });

  it("fails closed when production has no ADMIN_HUB_PASSWORD", () => {
    const prevVercel = process.env.VERCEL_ENV;
    delete process.env.ADMIN_HUB_PASSWORD;
    process.env.VERCEL_ENV = "production";
    expect(adminHubPassword()).toBeNull();
    expect(verifyAdminHubPassword("anything")).toBe(false);
    if (prevVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  });

  it("accepts the correct password and rejects wrong ones", () => {
    expect(verifyAdminHubPassword("test-hub-password")).toBe(true);
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
