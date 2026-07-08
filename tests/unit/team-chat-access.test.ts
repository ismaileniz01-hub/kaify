import { describe, expect, it } from "vitest";
import { canUseTeamChat, isTeamChatPlan } from "@/lib/billing/team-chat-access";

describe("team chat plan access", () => {
  it("allows only Pro and Premium plans", () => {
    expect(isTeamChatPlan("essential")).toBe(false);
    expect(isTeamChatPlan("pro")).toBe(true);
    expect(isTeamChatPlan("premium_max")).toBe(true);
    expect(isTeamChatPlan(null)).toBe(false);
  });

  it("blocks Essential even when streak unlocked", () => {
    expect(
      canUseTeamChat({ tier: "essential", teamChatUnlocked: true }),
    ).toBe(false);
  });

  it("allows Pro/Premium when streak unlocked", () => {
    expect(canUseTeamChat({ tier: "pro", teamChatUnlocked: true })).toBe(true);
    expect(
      canUseTeamChat({ tier: "premium_max", teamChatUnlocked: true }),
    ).toBe(true);
  });

  it("still requires streak unlock for Pro/Premium", () => {
    expect(canUseTeamChat({ tier: "pro", teamChatUnlocked: false })).toBe(false);
    expect(
      canUseTeamChat({ tier: "premium_max", teamChatUnlocked: false }),
    ).toBe(false);
  });
});
