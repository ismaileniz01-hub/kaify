import { describe, expect, it } from "vitest";
import { consumeAlexDraft, setAlexDraft } from "@/lib/chat/alex-draft";

describe("alex draft", () => {
  it("stores a one-shot composer draft", () => {
    setAlexDraft("I just did wall sits");
    expect(consumeAlexDraft()).toBe("I just did wall sits");
    expect(consumeAlexDraft()).toBeNull();
  });
});
