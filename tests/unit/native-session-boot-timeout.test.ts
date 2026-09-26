import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { withTimeout } from "../../native-app/src/boot-storage";

describe("native session storage timeout contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves hung SecureStorage reads so boot can leave the spinner", async () => {
    const hung = new Promise<string>(() => undefined);
    const resultPromise = withTimeout(hung, 2500, null);
    vi.advanceTimersByTime(2500);
    await expect(resultPromise).resolves.toBeNull();
  });
});
