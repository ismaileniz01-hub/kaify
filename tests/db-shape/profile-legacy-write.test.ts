/**
 * K-011: the legacy-column fallback must only ever absorb "legacy column does
 * not exist" and must never swallow any other write error.
 */
import { describe, expect, it, vi } from "vitest";
import {
  isMissingLegacyProfileColumnError,
  writeProfileWithLegacyMirror,
} from "@/lib/services/profile-legacy-write";

type Res = { data: unknown; error: { code?: string; message?: string } | null };

describe("writeProfileWithLegacyMirror", () => {
  it("writes the dual payload once when the legacy columns exist", async () => {
    const write = vi.fn(async (_payload: Record<string, unknown>): Promise<Res> => ({ data: { ok: 1 }, error: null }));
    const r = await writeProfileWithLegacyMirror({ display_name: "A", tier: null }, write);
    expect(r.error).toBeNull();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]?.[0]).toEqual({ display_name: "A", full_name: "A", tier: null, subscription_tier: null });
  });

  it.each([
    ["42703", 'column "subscription_tier" of relation "profiles" does not exist'],
    ["PGRST204", "Could not find the 'full_name' column of 'profiles' in the schema cache"],
  ])("retries canonical-only when a legacy column is missing (%s)", async (code, message) => {
    const write = vi
      .fn<(p: Record<string, unknown>) => Promise<Res>>()
      .mockResolvedValueOnce({ data: null, error: { code, message } })
      .mockResolvedValueOnce({ data: { ok: 1 }, error: null });
    const r = await writeProfileWithLegacyMirror({ display_name: "A", height_cm: 180, tier: null }, write);
    expect(r).toEqual({ data: { ok: 1 }, error: null });
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[1]?.[0]).toEqual({ display_name: "A", height_cm: 180, tier: null });
  });

  it.each([
    ["42501", "permission denied for table profiles"],
    ["23514", 'new row violates check constraint "profiles_height_check"'],
    ["42703", 'column "tier_started_at" of relation "profiles" does not exist'],
    ["42703", 'column "experience_level" of relation "profiles" does not exist'],
    ["57014", "canceling statement due to statement timeout"],
  ])("returns any other error untouched without retrying (%s)", async (code, message) => {
    const write = vi.fn(async (): Promise<Res> => ({ data: null, error: { code, message } }));
    const r = await writeProfileWithLegacyMirror({ display_name: "A", tier: null }, write);
    expect(r.error).toEqual({ code, message });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error from the canonical-only retry", async () => {
    const write = vi
      .fn<(p: Record<string, unknown>) => Promise<Res>>()
      .mockResolvedValueOnce({ data: null, error: { code: "42703", message: 'column "full_name" of relation "profiles" does not exist' } })
      .mockResolvedValueOnce({ data: null, error: { code: "42501", message: "permission denied" } });
    const r = await writeProfileWithLegacyMirror({ display_name: "A" }, write);
    expect(r.error).toEqual({ code: "42501", message: "permission denied" });
  });

  it("does not retry payloads without legacy mirrors", async () => {
    const write = vi.fn(async (): Promise<Res> => ({ data: null, error: { code: "42703", message: 'column "full_name" does not exist' } }));
    await writeProfileWithLegacyMirror({ bio: "x" }, write);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("classifies only legacy column names", () => {
    expect(isMissingLegacyProfileColumnError(null)).toBe(false);
    expect(isMissingLegacyProfileColumnError({ code: "42703", message: 'column "height_cm" does not exist' })).toBe(false);
    expect(isMissingLegacyProfileColumnError({ code: "42703", message: 'column "height" does not exist' })).toBe(true);
  });
});
