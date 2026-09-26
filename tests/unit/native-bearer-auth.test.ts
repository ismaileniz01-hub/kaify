import { beforeEach, describe, expect, it, vi } from "vitest";

const { bearerGetUser, cookieGetUser, createClient, createServerClient } =
  vi.hoisted(() => ({
    bearerGetUser: vi.fn(),
    cookieGetUser: vi.fn(),
    createClient: vi.fn(),
    createServerClient: vi.fn(),
  }));

vi.mock("@/lib/supabase/env", () => ({
  assertServerRuntime: vi.fn(),
  getSupabasePublicEnv: () => ({
    url: "https://project.supabase.co",
    anonKey: "anon-key",
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

import { getServerAuthUser } from "@/lib/supabase/server";

describe("native bearer authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockReturnValue({ auth: { getUser: bearerGetUser } });
    createServerClient.mockReturnValue({ auth: { getUser: cookieGetUser } });
    bearerGetUser.mockResolvedValue({
      data: { user: { id: "native-user", email: "native@example.com" } },
      error: null,
    });
    cookieGetUser.mockResolvedValue({
      data: { user: { id: "cookie-user", email: "cookie@example.com" } },
      error: null,
    });
  });

  it("validates a bearer token directly and does not fall back to cookies", async () => {
    const request = new Request("https://kaifyai.org/api/v1/profile", {
      headers: { Authorization: "Bearer access-token" },
    });
    await expect(getServerAuthUser(request)).resolves.toEqual({
      id: "native-user",
      email: "native@example.com",
    });
    expect(bearerGetUser).toHaveBeenCalledWith("access-token");
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("returns null for an invalid bearer instead of accepting a cookie session", async () => {
    bearerGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid token"),
    });
    const request = new Request("https://kaifyai.org/api/v1/profile", {
      headers: { Authorization: "Bearer invalid" },
    });
    await expect(getServerAuthUser(request)).resolves.toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
