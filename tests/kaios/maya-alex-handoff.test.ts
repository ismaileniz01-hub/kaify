import { describe, expect, it } from "vitest";
import { ensureMayaAlexHandoff } from "@/lib/kaios/maya/alex-handoff";

describe("ensureMayaAlexHandoff", () => {
  it("appends an Alex handoff when Maya parks training for later", () => {
    const out = ensureMayaAlexHandoff({
      text: "Yemeği kaydedelim, sporu sonra konuşuruz.",
      locale: "tr",
      coachId: "maya",
      userMessage: "antrenmandan sonra ne yesem",
    });
    expect(out).toContain("/chat/alex");
    expect(out).toMatch(/Alex/i);
  });

  it("does not duplicate when Maya already named Alex", () => {
    const text = "Bunu Alex ile konuş, /chat/alex";
    expect(
      ensureMayaAlexHandoff({
        text,
        locale: "tr",
        coachId: "maya",
        userMessage: "spor ne zaman",
      }),
    ).toBe(text);
  });
});
