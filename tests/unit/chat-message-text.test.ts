import { describe, expect, it } from "vitest";
import { splitChatInlineBold } from "@/lib/chat/inline-bold";

describe("splitChatInlineBold", () => {
  it("parses **bold** segments", () => {
    expect(splitChatInlineBold("Hello **world** today")).toEqual([
      { type: "text", value: "Hello " },
      { type: "bold", value: "world" },
      { type: "text", value: " today" },
    ]);
  });

  it("handles multiple bold spans", () => {
    const segments = splitChatInlineBold("**A** and **B**");
    expect(segments.filter((s) => s.type === "bold").map((s) => s.value)).toEqual([
      "A",
      "B",
    ]);
  });

  it("returns plain text when no markers", () => {
    expect(splitChatInlineBold("plain")).toEqual([{ type: "text", value: "plain" }]);
  });
});
