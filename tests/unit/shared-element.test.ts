import { describe, expect, it } from "vitest";
import { coachAvatarTransitionName } from "@/lib/motion/shared-element";

describe("coachAvatarTransitionName", () => {
  it("builds a stable shared-element name per coach", () => {
    expect(coachAvatarTransitionName("kai")).toBe("coach-avatar-kai");
    expect(coachAvatarTransitionName("alex")).toBe("coach-avatar-alex");
  });
});
