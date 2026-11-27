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

import { mapGoTrueOtpSendError } from "@/lib/auth/map-otp-send-error";
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
  it("creates an UNCONFIRMED user via Admin then POSTs /otp with create_user false", async () => {
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
      email_confirm: false,
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

  it.each([
    ["an existing user", { code: "email_exists", status: 422, message: "already been registered" }],
    ["a concurrent signup", { status: 500, message: "Database error creating new user" }],
  ])("still POSTs /otp and never confirms when createUser reports %s", async (_label, error) => {
    stubEnv();
    createUser.mockResolvedValue({ data: { user: null }, error });
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(sendAuthEmailOtp("user@example.com", "tr")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(listUsers).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
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

  it("uses the string error code when GoTrue also sends a numeric one", async () => {
    stubEnv();
    createUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 429,
          error_code: "over_email_send_rate_limit",
          msg: "For security purposes, you can only request this after 42 seconds.",
        }),
        { status: 429 },
      ),
    ) as unknown as typeof fetch;

    const result = await sendAuthEmailOtp("a@b.com");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("over_email_send_rate_limit");
      expect(mapGoTrueOtpSendError(result.error).code).toBe("RATE_LIMITED");
    }
  });

  it("waits for the auth row before asking GoTrue for a code", async () => {
    stubEnv();
    const order: string[] = [];
    createUser.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("createUser done");
      return { data: { user: { id: "user-1" } }, error: null };
    });
    global.fetch = vi.fn(async () => {
      order.push("otp");
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    await sendAuthEmailOtp("a@b.com");

    expect(order).toEqual(["createUser done", "otp"]);
  });
});
