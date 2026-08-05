import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAuthEmailOtp } from "@/lib/auth/send-otp-server";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("sendAuthEmailOtp", () => {
  it("POSTs to GoTrue /otp with create_user and normalized email", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(sendAuthEmailOtp("User@Example.com")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/otp",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          create_user: true,
          data: { language: "en" },
        }),
      }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).not.toHaveProperty("redirect_to");
    expect(body).not.toHaveProperty("code_challenge");
  });

  it("passes the selected language to localized email templates", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendAuthEmailOtp("user@example.com", "tr");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      data: { language: "tr" },
    });
  });

  it("returns structured error on non-2xx", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ msg: "rate limit", error_code: "over_request_rate" }), {
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
