import { afterEach, describe, expect, it, vi } from "vitest";
import { enterRealKaify, nativeConsumeUrl } from "../../native-app/src/enter-kaify";

describe("native product handoff", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens Kaify with a first-party consume ticket after OTP", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    const result = await enterRealKaify(
      "access-token-value-20xx",
      "refresh-token",
      "ticket-abc",
    );
    expect(result).toEqual({ ok: true });
    expect(assign).toHaveBeenCalledTimes(1);
    const url = String(assign.mock.calls[0][0]);
    expect(url).toBe(nativeConsumeUrl("ticket-abc"));
    expect(url.startsWith("https://kaifyai.org/api/auth/session/native-consume?ticket=")).toBe(
      true,
    );
    expect(url).not.toContain("access_token=");
    expect(url).not.toContain("CHOOSE YOUR PLAN");
  });

  it("mints a ticket when verify did not return one", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { ticket: "minted-1" } }),
      }),
    );
    const result = await enterRealKaify("access-token-value-20xx", "refresh-token");
    expect(result).toEqual({ ok: true });
    expect(assign).toHaveBeenCalledWith(nativeConsumeUrl("minted-1"));
  });

  it("fails closed when ticket minting fails (no hash fallback)", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    const result = await enterRealKaify("access-token-value-20xx", "refresh-token");
    expect(result.ok).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });
});
