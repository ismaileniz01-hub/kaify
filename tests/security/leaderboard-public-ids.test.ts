import { describe, expect, it } from "vitest";
import { maskUserId, resolveLeaderboardUserId } from "@/lib/privacy/mask-user-id";
import {
  mintAvatarViewToken,
  publicAvatarSrc,
  verifyAvatarViewToken,
} from "@/lib/security/avatar-access-token";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const UUID_A = "550e8400-e29b-41d4-a716-446655440000";
const UUID_B = "a11ce000-0000-4000-8000-000000000001";
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("public leaderboard identifiers (SEC-009)", () => {
  it("never returns a raw UUID to a different viewer", () => {
    const publicId = resolveLeaderboardUserId(UUID_A, UUID_B);
    expect(publicId).toBe(maskUserId(UUID_A));
    expect(publicId).not.toMatch(UUID_RE);
  });

  it("avatar view tokens do not contain the UUID in plaintext", () => {
    const token = mintAvatarViewToken(UUID_A);
    expect(token).not.toMatch(UUID_RE);
    expect(Buffer.from(token, "base64url").toString("utf8")).not.toContain(UUID_A);
    expect(verifyAvatarViewToken(token)).toBe(UUID_A);
    expect(publicAvatarSrc(UUID_A)).toContain("/api/media/avatar?t=");
    expect(publicAvatarSrc(UUID_A)).not.toMatch(UUID_RE);
  });

  it("rejects expired or tampered tokens", () => {
    const token = mintAvatarViewToken(UUID_A, Date.now() - 3 * 60 * 60 * 1000);
    expect(verifyAvatarViewToken(token)).toBeNull();
    expect(verifyAvatarViewToken("aaaa")).toBeNull();
  });

  it("public leaderboard route maps only public-safe fields", () => {
    const src = readFileSync(join(process.cwd(), "app/api/leaderboard/route.ts"), "utf8");
    expect(src).toContain("getPublicGlobalLeaderboard");
    expect(src).toContain("auth: \"none\"");
  });

  it("leaderboard service strips storage paths before responding", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/leaderboard.service.ts"),
      "utf8",
    );
    expect(src).toContain("publicAvatarSrc");
    expect(src).toContain("resolveLeaderboardUserId");
    expect(src).not.toContain("signLeaderboardAvatars");
  });
});
