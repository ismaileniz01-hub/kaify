import { describe, expect, it } from "vitest";
import { profileUpdateSchema } from "@/lib/validations/profile.schema";

describe("profileUpdateSchema avatarUrl", () => {
  it("rejects arbitrary avatar URLs (IDOR vector)", () => {
    const parsed = profileUpdateSchema.safeParse({
      avatarUrl:
        "https://example.supabase.co/storage/v1/object/public/avatars/a11ce000-0000-4000-8000-000000000001/avatar.jpg",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows clearing avatar with null", () => {
    const parsed = profileUpdateSchema.safeParse({ avatarUrl: null });
    expect(parsed.success).toBe(true);
  });
});
