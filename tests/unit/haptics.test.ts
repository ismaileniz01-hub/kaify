import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/native/platform", () => ({
  isNativePlatform: vi.fn(async () => false),
}));

import { isNativePlatform } from "@/lib/native/platform";
import {
  hapticImpact,
  hapticNotification,
  hapticSelection,
} from "@/lib/native/haptics";

describe("haptics", () => {
  beforeEach(() => {
    vi.mocked(isNativePlatform).mockResolvedValue(false);
    vi.unstubAllGlobals();
  });

  it("no-ops on web", async () => {
    await expect(hapticImpact("light")).resolves.toBeUndefined();
    await expect(hapticNotification("success")).resolves.toBeUndefined();
    await expect(hapticSelection()).resolves.toBeUndefined();
  });

  it("no-ops when reduced motion is preferred", async () => {
    vi.mocked(isNativePlatform).mockClear();
    vi.mocked(isNativePlatform).mockResolvedValue(true);
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: String(query).includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    await hapticSelection();
    expect(isNativePlatform).not.toHaveBeenCalled();
  });
});
