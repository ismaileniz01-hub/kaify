import { describe, expect, it } from "vitest";
import { computeRevealScroll } from "@/lib/native/keyboard-reveal";
import { chatBubbleRadius, chatGroupPosition } from "@/lib/chat/message-groups";
import { isNearBottom } from "@/lib/chat/scroll-anchor";
import { chatUserInitials, isChatUserPhoto } from "@/lib/chat/chat-avatar";

describe("computeRevealScroll", () => {
  const visible = { visibleTop: 0, visibleBottom: 508 };

  it("does nothing when field and CTA are above the keyboard", () => {
    expect(
      computeRevealScroll({ ...visible, fieldTop: 200, fieldBottom: 244, ctaBottom: 400 }),
    ).toBe(0);
  });

  it("lifts the field and its CTA above the keyboard", () => {
    expect(
      computeRevealScroll({ ...visible, fieldTop: 520, fieldBottom: 564, ctaBottom: 640 }),
    ).toBe(640 - (508 - 16));
  });

  it("never pushes the field under the header to show a far CTA", () => {
    const delta = computeRevealScroll({
      ...visible,
      fieldTop: 300,
      fieldBottom: 344,
      ctaBottom: 1400,
    });
    // CTA does not fit with the field, so only the field is considered: it fits.
    expect(delta).toBe(0);
  });

  it("caps the lift so a tall field stays below the top clearance", () => {
    // Needs 68px to clear the keyboard but only 28px fit under the header.
    const delta = computeRevealScroll({
      ...visible,
      fieldTop: 100,
      fieldBottom: 560,
      ctaBottom: null,
    });
    expect(delta).toBe(100 - 72);
  });

  it("scrolls down when the field sits under the header", () => {
    expect(
      computeRevealScroll({ ...visible, fieldTop: 20, fieldBottom: 64, ctaBottom: null }),
    ).toBe(20 - 72);
  });
});

describe("chat message groups", () => {
  const thread = [
    { from: "coach" },
    { from: "coach" },
    { from: "user" },
    { from: "coach" },
  ];

  it("marks the first and last bubble of each run", () => {
    expect(chatGroupPosition(thread, 0)).toEqual({ first: true, last: false });
    expect(chatGroupPosition(thread, 1)).toEqual({ first: false, last: true });
    expect(chatGroupPosition(thread, 2)).toEqual({ first: true, last: true });
    expect(chatGroupPosition(thread, 3)).toEqual({ first: true, last: true });
  });

  it("puts the tail on the avatar side of the last bubble only", () => {
    expect(chatBubbleRadius("coach", true)).toBe("18px 18px 18px 6px");
    expect(chatBubbleRadius("user", true)).toBe("18px 18px 6px 18px");
    expect(chatBubbleRadius("coach", false)).toBe("18px");
  });
});

describe("isNearBottom", () => {
  it("follows only within the threshold", () => {
    expect(isNearBottom({ scrollHeight: 2000, scrollTop: 1350, clientHeight: 600 })).toBe(true);
    expect(isNearBottom({ scrollHeight: 2000, scrollTop: 1000, clientHeight: 600 })).toBe(false);
  });
});

describe("chat user avatar", () => {
  it("never treats the brand logo as a user photo", () => {
    expect(isChatUserPhoto("/kaify-logo.png")).toBe(false);
    expect(isChatUserPhoto(undefined)).toBe(false);
    expect(isChatUserPhoto("  ")).toBe(false);
    expect(isChatUserPhoto("https://cdn.example/avatar.jpg")).toBe(true);
  });

  it("builds initials from first and last words", () => {
    expect(chatUserInitials("ismail eniz")).toBe("IE");
    expect(chatUserInitials("Özge")).toBe("Ö");
    expect(chatUserInitials("  Ada   Lovelace King ")).toBe("AK");
    expect(chatUserInitials("🔥")).toBe("");
    expect(chatUserInitials(null)).toBe("");
  });
});
