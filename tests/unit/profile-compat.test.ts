import { describe, it, expect } from "vitest";
import {
  applyLegacyProfileWrites,
  resolveDisplayName,
  resolveTier,
} from "@/lib/supabase/profile-compat";

describe("profile-compat", () => {
  it("prefers display_name over full_name", () => {
    expect(resolveDisplayName({ display_name: "A", full_name: "B" })).toBe("A");
  });

  it("falls back to full_name", () => {
    expect(resolveDisplayName({ full_name: "Legacy" })).toBe("Legacy");
  });

  it("returns null when no tier is set", () => {
    expect(resolveTier({})).toBeNull();
  });

  it("resolves tier from subscription_tier", () => {
    expect(resolveTier({ subscription_tier: "pro" })).toBe("pro");
  });

  it("dual-writes legacy columns on update", () => {
    const out = applyLegacyProfileWrites({
      display_name: "X",
      height_cm: 180,
      tier: "essential",
    });
    expect(out.full_name).toBe("X");
    expect(out.height).toBe(180);
    expect(out.subscription_tier).toBe("essential");
  });
});
