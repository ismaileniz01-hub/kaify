import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isOwnedAvatarPath } from "@/lib/services/avatar-storage.service";

const USER_A = "388fd97b-5dda-40e0-bbed-8c9783cc7ecd";
const USER_B = "a11ce000-0000-4000-8000-000000000001";

describe("avatar storage policy (SEC-012)", () => {
  it("path ownership rejects foreign and traversal paths", () => {
    expect(isOwnedAvatarPath(`${USER_A}/avatar.jpg`, USER_A)).toBe(true);
    expect(isOwnedAvatarPath(`${USER_B}/avatar.jpg`, USER_A)).toBe(false);
    expect(isOwnedAvatarPath(`../${USER_A}/avatar.jpg`, USER_A)).toBe(false);
    expect(isOwnedAvatarPath(`${USER_A}/../${USER_B}/avatar.jpg`, USER_A)).toBe(false);
  });

  it("Wave 3 keeps avatars private; Wave 8 drops client INSERT/UPDATE", () => {
    const wave3 = readFileSync(
      join(process.cwd(), "supabase/migrations/20260814120000_wave3_security_privacy.sql"),
      "utf8",
    );
    expect(wave3).toMatch(/set public = false/);
    expect(wave3).toMatch(/drop policy if exists "avatars_public_read"/);
    const wave8 = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260814180000_wave8_admin_aal2_avatar_writes.sql",
      ),
      "utf8",
    );
    expect(wave8).toContain('drop policy if exists "avatars_upload_own"');
    expect(wave8).toContain('drop policy if exists "avatars_update_own"');
    expect(wave8).toMatch(/aal2/);
  });

  it("account deletion still removes avatar objects", () => {
    const src = readFileSync(join(process.cwd(), "lib/services/account.service.ts"), "utf8");
    expect(src).toContain('.from(AVATAR_BUCKET)');
    expect(src).toContain(".remove(");
  });

  it("avatar upload invalidates signed URL cache", () => {
    const src = readFileSync(join(process.cwd(), "app/api/profile/avatar/route.ts"), "utf8");
    expect(src).toContain("cacheDelete");
    expect(src).toContain("CacheKeys.avatarSigned");
  });
});
