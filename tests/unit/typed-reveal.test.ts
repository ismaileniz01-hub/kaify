import { describe, expect, it } from "vitest";
import { typedRevealStep } from "@/lib/chat/typed-reveal";

describe("typedRevealStep", () => {
  it("stops when caught up", () => {
    expect(typedRevealStep(12, 12)).toBe(0);
  });

  it("types short replies in a few frames instead of all at once", () => {
    expect(typedRevealStep(0, 20)).toBe(3);
    expect(typedRevealStep(0, 8)).toBe(3);
  });

  it("finishes a typical coach reply in about 14 frames", () => {
    expect(typedRevealStep(0, 140)).toBe(10);
    expect(typedRevealStep(0, 280)).toBe(20);
  });
});
