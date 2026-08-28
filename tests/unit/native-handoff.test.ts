import { afterEach, describe, expect, it, vi } from "vitest";
import { enterRealKaify } from "../../native-app/src/enter-kaify";

describe("native product handoff", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the real Kaify web app after OTP, not the local Vite shell", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    enterRealKaify("access-token", "refresh-token");
    expect(assign).toHaveBeenCalledTimes(1);
    const url = String(assign.mock.calls[0][0]);
    expect(url.startsWith("https://kaifyai.org/login/native-entry#")).toBe(true);
    expect(url).toContain("access_token=access-token");
    expect(url).toContain("refresh_token=refresh-token");
    expect(url).not.toContain("CHOOSE YOUR PLAN");
  });
});
