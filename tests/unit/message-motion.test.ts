import { describe, expect, it } from "vitest";
import { chatBubbleEnterClass } from "@/lib/chat/message-motion";

describe("chatBubbleEnterClass", () => {
  it("skips enter motion for history messages", () => {
    expect(chatBubbleEnterClass("user", false)).toBe("chat-message-bubble");
    expect(chatBubbleEnterClass("coach", false)).toBe("chat-message-bubble");
  });

  it("applies enter motion classes for new user and coach bubbles", () => {
    expect(chatBubbleEnterClass("user", true)).toContain("animate-message--user");
    expect(chatBubbleEnterClass("coach", true)).toContain("animate-message--coach");
  });
});
