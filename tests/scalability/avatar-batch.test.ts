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

describe("createSignedAvatarUrlsBatch", () => {
  beforeEach(() => {
    createSignedUrls.mockReset();
    createSignedUrl.mockReset();
  });

  it("uses batch API when available", async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ path: "u1/avatar.jpg", signedUrl: "https://signed/1" }],
      error: null,
    });

    const { createSignedAvatarUrlsBatch } = await import(
      "@/lib/services/avatar-storage.service"
    );

    const map = await createSignedAvatarUrlsBatch(["u1/avatar.jpg", "/static.png"]);
    expect(map.get("u1/avatar.jpg")).toBe("https://signed/1");
    expect(createSignedUrls).toHaveBeenCalledOnce();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("deduplicates identical paths", async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ path: "u1/avatar.jpg", signedUrl: "https://signed/1" }],
      error: null,
    });

    const { createSignedAvatarUrlsBatch } = await import(
      "@/lib/services/avatar-storage.service"
    );

    await createSignedAvatarUrlsBatch(["u1/avatar.jpg", "u1/avatar.jpg"]);
    expect(createSignedUrls).toHaveBeenCalledWith(["u1/avatar.jpg"], 3600);
  });
});
