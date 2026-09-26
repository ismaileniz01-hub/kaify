import { afterEach, describe, expect, it, vi } from "vitest";

const createUser = vi.fn();
const updateUserById = vi.fn();
const listUsers = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      admin: {
        createUser,
        updateUserById,
        listUsers,
      },
    },
  }),
}));

import { sendAuthEmailOtp } from "@/lib/auth/send-otp-server";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
  createUser.mockReset();
  updateUserById.mockReset();
  listUsers.mockReset();
});

function stubEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
}

describe("sendAuthEmailOtp", () => {
  it("confirms the user via Admin then POSTs /otp with create_user false", async () => {
    stubEnv();
    createUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(sendAuthEmailOtp("User@Example.com")).resolves.toEqual({
      ok: true,
    });

    expect(createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      email_confirm: true,
      user_metadata: { language: "en" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/otp",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          create_user: false,
          data: { language: "en" },
        }),
      }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).not.toHaveProperty("redirect_to");
    expect(body).not.toHaveProperty("code_challenge");
  });

  it("confirms an existing unconfirmed user instead of sending a signup link", async () => {
    stubEnv();
    createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "A user with this email address has already been registered" },
    });
    listUsers.mockResolvedValue({
      data: {
        users: [{ id: "existing-1", email: "user@example.com" }],
      },
      error: null,
    });
    updateUserById.mockResolvedValue({ data: { user: { id: "existing-1" } }, error: null });
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 })) as unknown as typeof fetch;

    await expect(sendAuthEmailOtp("user@example.com", "tr")).resolves.toEqual({
      ok: true,
    });

    expect(updateUserById).toHaveBeenCalledWith("existing-1", {
      email_confirm: true,
    });
  });

  it("returns structured error on non-2xx OTP response", async () => {
    stubEnv();
    createUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ msg: "rate limit", error_code: "over_email_send_rate_limit" }), {
        status: 429,
      }),
    ) as unknown as typeof fetch;

    const result = await sendAuthEmailOtp("a@b.com");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(429);
      expect(result.error.message).toMatch(/rate limit/i);
    }
  });
});
