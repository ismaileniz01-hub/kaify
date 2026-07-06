import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

function mockSupabase(factors: { totp: { status: string }[] }, aal: { currentLevel: string }) {
  return {
    auth: {
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: factors.totp }, error: null }),
        getAuthenticatorAssuranceLevel: vi
          .fn()
          .mockResolvedValue({ data: aal, error: null }),
      },
    },
  };
}

describe("assertAdminMfa", () => {
  it("rejects admin without enrolled TOTP", async () => {
    const { assertAdminMfa } = await import("@/lib/auth/admin-mfa");
    const supabase = mockSupabase({ totp: [] }, { currentLevel: "aal1" });

    await expect(assertAdminMfa(supabase as never)).rejects.toThrow(ApiError);
  });

  it("rejects admin with TOTP but not AAL2", async () => {
    const { assertAdminMfa } = await import("@/lib/auth/admin-mfa");
    const supabase = mockSupabase({ totp: [{ status: "verified" }] }, { currentLevel: "aal1" });

    await expect(assertAdminMfa(supabase as never)).rejects.toThrow(ApiError);
  });

  it("passes when TOTP verified and AAL2", async () => {
    const { assertAdminMfa } = await import("@/lib/auth/admin-mfa");
    const supabase = mockSupabase({ totp: [{ status: "verified" }] }, { currentLevel: "aal2" });

    await expect(assertAdminMfa(supabase as never)).resolves.toBeUndefined();
  });
});
