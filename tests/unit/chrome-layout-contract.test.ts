import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { shouldShowBottomNav } from "@/lib/navigation/bottom-nav";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("phase 3–4 chrome contract", () => {
  it("sizes the header as auto / flexible title / auto", () => {
    expect(read("app/globals.css")).toContain(
      "grid-template-columns: auto minmax(0, 1fr) auto",
    );
  });

  it("puts gem and freezie in one chip and parks overflow actions in a menu", () => {
    const welcome = read("app/(app)/welcome/page.tsx");
    expect(welcome).toContain("<BalanceChip");
    expect(welcome).toContain("<HeaderMenu");
    expect(welcome).not.toContain("<GemBalance");
    expect(welcome).not.toContain("<FreezieBalance");
    expect(read("app/(app)/streak/page.tsx")).toContain("<BalanceChip");
    expect(read("app/(app)/trophy-road/page.tsx")).toContain("<BalanceChip");
  });

  it("reserves freezie width before hydration", () => {
    const source = read("components/FreezieBalance.tsx");
    expect(source).toContain("if (!mounted)");
    expect(source).not.toContain("if (!mounted) return null");
    expect(source).toContain("opacity-0");
  });

  it("keeps the streak card in stacked zones", () => {
    const card = read("components/StreakCard.tsx");
    expect(card).toContain("clamp(4.25rem, 18vw, 6.5rem)");
    expect(card).not.toContain("top-[58%]");
    expect(card).not.toContain("text-[120px]");
    expect(card).toContain("footer=");
  });

  it("draws the rank badge outside the clipped flag", () => {
    const board = read("components/welcome/WelcomeLeaderboard.tsx");
    const flag = board.indexOf('overflow-hidden rounded-full ring-2');
    const badge = board.indexOf("-bottom-1 -end-1");
    expect(flag).toBeGreaterThan(0);
    expect(badge).toBeGreaterThan(flag);
  });

  it("hides the dock on the account page and scrolls dialogs", () => {
    expect(shouldShowBottomNav("/myaccount")).toBe(false);
    const dialog = read("components/ui/MotionDialog.tsx");
    expect(dialog).toContain("motion-dialog__body");
    expect(dialog).toContain("motion-dialog__footer");
    expect(read("app/globals.css")).toContain(
      "max-height: min(90dvh, calc(100dvh - var(--safe-top) - var(--safe-bottom) - 2rem))",
    );
  });

  it("keeps white labels on filled purple actions in the light theme", () => {
    const theme = read("app/light-theme.css");
    expect(theme).toContain(".account-btn--primary");
    expect(theme).toContain("color: #ffffff");
    expect(theme).toContain(".bottom-nav__link--active");
    expect(theme).toContain('[class*="from-purple-"]');
  });
});
