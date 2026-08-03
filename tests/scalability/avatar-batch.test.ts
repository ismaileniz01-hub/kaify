import { describe, expect, it, vi, beforeEach } from "vitest";

const createSignedUrls = vi.fn();
const createSignedUrl = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    storage: {
      from: () => ({
        createSignedUrls,
        createSignedUrl,
      }),
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/cache", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

const USER_A = "388fd97b-5dda-40e0-bbed-8c9783cc7ecd";
const USER_B = "a11ce000-0000-4000-8000-000000000001";
const PATH_A = `${USER_A}/avatar.jpg`;
const PATH_B = `${USER_B}/avatar.jpg`;

describe("createSignedAvatarUrlsBatch", () => {
  beforeEach(() => {
    createSignedUrls.mockReset();
    createSignedUrl.mockReset();
  });

  it("uses batch API when available", async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ path: PATH_A, signedUrl: "https://signed/1" }],
      error: null,
    });

    const { createSignedAvatarUrlsBatch } = await import(
      "@/lib/services/avatar-storage.service"
    );

    const map = await createSignedAvatarUrlsBatch([PATH_A, "/static.png"]);
    expect(map.get(PATH_A)).toBe("https://signed/1");
    expect(createSignedUrls).toHaveBeenCalledOnce();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("deduplicates identical paths", async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ path: PATH_A, signedUrl: "https://signed/1" }],
      error: null,
    });

    const { createSignedAvatarUrlsBatch } = await import(
      "@/lib/services/avatar-storage.service"
    );

    await createSignedAvatarUrlsBatch([PATH_A, PATH_A]);
    expect(createSignedUrls).toHaveBeenCalledWith([PATH_A], 3600);
  });
});

describe("avatar signed-URL ownership (IDOR hardening)", () => {
  beforeEach(() => {
    createSignedUrls.mockReset();
    createSignedUrl.mockReset();
  });

  it("refuses to sign a foreign user's avatar path", async () => {
    const { createSignedAvatarUrl, sanitizeAvatarStorageRef } = await import(
      "@/lib/services/avatar-storage.service"
    );

    expect(sanitizeAvatarStorageRef(PATH_B, USER_A)).toBeNull();
    expect(
      sanitizeAvatarStorageRef(
        `https://xyz.supabase.co/storage/v1/object/public/avatars/${PATH_B}`,
        USER_A,
      ),
    ).toBeNull();

    await expect(createSignedAvatarUrl(PATH_B, USER_A)).resolves.toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("signs only when path belongs to the owner", async () => {
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed/own" },
      error: null,
    });

    const { createSignedAvatarUrl } = await import(
      "@/lib/services/avatar-storage.service"
    );

    await expect(createSignedAvatarUrl(PATH_A, USER_A)).resolves.toBe(
      "https://signed/own",
    );
    expect(createSignedUrl).toHaveBeenCalledWith(PATH_A, 3600);
  });

  it("rejects path traversal and non-avatar object names", async () => {
    const { isOwnedAvatarPath } = await import(
      "@/lib/services/avatar-storage.service"
    );
    expect(isOwnedAvatarPath(`${USER_A}/../${USER_B}/avatar.jpg`, USER_A)).toBe(
      false,
    );
    expect(isOwnedAvatarPath(`${USER_A}/secrets.txt`, USER_A)).toBe(false);
  });

  it("batch signing drops refs that do not match owner map", async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ path: PATH_A, signedUrl: "https://signed/1" }],
      error: null,
    });

    const { createSignedAvatarUrlsBatch } = await import(
      "@/lib/services/avatar-storage.service"
    );

    const ownerByRef = new Map<string, string>([
      [PATH_A, USER_A],
      [PATH_B, USER_A], // attacker claimed victim path under wrong owner
    ]);
    const map = await createSignedAvatarUrlsBatch([PATH_A, PATH_B], ownerByRef);
    expect(map.get(PATH_A)).toBe("https://signed/1");
    expect(map.has(PATH_B)).toBe(false);
    expect(createSignedUrls).toHaveBeenCalledWith([PATH_A], 3600);
  });
});
