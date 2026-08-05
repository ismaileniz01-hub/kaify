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
  });

  it("no-ops on web", async () => {
    await expect(hapticImpact("light")).resolves.toBeUndefined();
    await expect(hapticNotification("success")).resolves.toBeUndefined();
    await expect(hapticSelection()).resolves.toBeUndefined();
  });
});
