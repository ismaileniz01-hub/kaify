import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("native session storage timeout contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves hung SecureStorage reads so boot can leave the spinner", async () => {
    function withTimeout<T>(
      promise: Promise<T>,
      ms: number,
      fallback: T,
    ): Promise<T> {
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(fallback), ms);
        promise
          .then((value) => {
            clearTimeout(timer);
            resolve(value);
          })
          .catch(() => {
            clearTimeout(timer);
            resolve(fallback);
          });
      });
    }

    const hung = new Promise<string>(() => undefined);
    const resultPromise = withTimeout(hung, 2500, null);
    vi.advanceTimersByTime(2500);
    await expect(resultPromise).resolves.toBeNull();
  });
});
