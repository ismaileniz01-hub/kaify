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

  it("still sends them to Alex when Maya defers sport on a food log", () => {
    const out = ensureMayaAlexHandoff({
      text: "Afiyet. Sporu sonra konuşuruz.",
      locale: "tr",
      coachId: "maya",
      userMessage: "bir kase sütlaç yedim",
    });
    expect(out).toContain("/chat/alex");
  });

  it("does not duplicate when the Alex path is already present", () => {
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

  it("still adds /chat/alex when Maya named Alex without the path", () => {
    const out = ensureMayaAlexHandoff({
      text: "Bunu Alex'e sor.",
      locale: "tr",
      coachId: "maya",
      userMessage: "spor ne zaman",
    });
    expect(out).toContain("/chat/alex");
  });
});
