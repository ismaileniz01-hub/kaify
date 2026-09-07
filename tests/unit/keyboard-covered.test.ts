import { describe, expect, it } from "vitest";
import { coveredByKeyboard } from "@/lib/native/keyboard-covered";

describe("coveredByKeyboard", () => {
  it("uses the plugin height when there is no window visual viewport", () => {
    expect(coveredByKeyboard(320)).toBe(320);
    expect(coveredByKeyboard(-10)).toBe(0);
  });
});
