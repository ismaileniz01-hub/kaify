import { describe, expect, it } from "vitest";
import { chatBubbleEnterClass } from "@/lib/chat/message-motion";

describe("chatBubbleEnterClass", () => {
  it("skips enter motion for history messages", () => {
    expect(chatBubbleEnterClass("user", true)).toBe("chat-message-bubble");
    expect(chatBubbleEnterClass("coach", true)).toBe("chat-message-bubble");
  });

  it("sends the user bubble in from the right and the coach from the left", () => {
    expect(chatBubbleEnterClass("user", false)).toContain("animate-message--user");
    expect(chatBubbleEnterClass("coach", false)).toContain("animate-message--coach");
  });
});
