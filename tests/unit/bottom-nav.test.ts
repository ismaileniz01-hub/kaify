import { describe, expect, it } from "vitest";
import { shouldShowBottomNav } from "@/lib/navigation/bottom-nav";

describe("shouldShowBottomNav", () => {
  it("shows on primary app tabs", () => {
    expect(shouldShowBottomNav("/welcome")).toBe(true);
    expect(shouldShowBottomNav("/messages")).toBe(true);
    expect(shouldShowBottomNav("/streak")).toBe(true);
    expect(shouldShowBottomNav("/trophy-road")).toBe(true);
    expect(shouldShowBottomNav("/settings")).toBe(true);
  });

  it("hides on chat, auth, and marketing paths", () => {
    expect(shouldShowBottomNav("/chat/kai")).toBe(false);
    expect(shouldShowBottomNav("/chat/team")).toBe(false);
    expect(shouldShowBottomNav("/login")).toBe(false);
    expect(shouldShowBottomNav("/signup")).toBe(false);
    expect(shouldShowBottomNav("/pricing")).toBe(false);
    expect(shouldShowBottomNav("/admin")).toBe(false);
  });
});
