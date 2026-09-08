import { afterEach, describe, expect, it, vi } from "vitest";
import { enterRealKaify, nativeConsumeUrl } from "../../native-app/src/enter-kaify";

describe("native product handoff", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens Kaify with a first-party consume ticket after OTP", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    enterRealKaify("access-token-value-20xx", "refresh-token", "ticket-abc");
    expect(assign).toHaveBeenCalledTimes(1);
    const url = String(assign.mock.calls[0][0]);
    expect(url).toBe(nativeConsumeUrl("ticket-abc"));
    expect(url.startsWith("https://kaifyai.org/api/auth/session/native-consume?ticket=")).toBe(
      true,
    );
    expect(url).not.toContain("access_token=");
    expect(url).not.toContain("CHOOSE YOUR PLAN");
  });

  it("falls back to hash native-entry when ticket minting fails", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    enterRealKaify("access-token-value-20xx", "refresh-token");
    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledTimes(1);
    });
    const url = String(assign.mock.calls[0][0]);
    expect(url.startsWith("https://kaifyai.org/login/native-entry#")).toBe(true);
    expect(url).toContain("access_token=access-token-value-20xx");
  });
});
