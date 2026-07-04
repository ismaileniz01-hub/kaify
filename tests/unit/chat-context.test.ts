import { describe, expect, it } from "vitest";
import { countConsecutiveRestDays } from "@/lib/ai/chat-context";
import { buildChatSystemPrompt } from "@/lib/ai/personas";

describe("countConsecutiveRestDays", () => {
  it("returns 0 when today has a logged workout", () => {
    const rows = [
      { entry_date: "2026-07-04", workouts_completed: 1 },
      { entry_date: "2026-07-03", workouts_completed: 0 },
    ];
    expect(countConsecutiveRestDays(rows, "2026-07-04")).toBe(0);
  });

  it("counts consecutive rest days including today", () => {
    const rows = [
      { entry_date: "2026-07-04", workouts_completed: 0 },
      { entry_date: "2026-07-03", workouts_completed: 0 },
      { entry_date: "2026-07-02", workouts_completed: 1 },
    ];
    expect(countConsecutiveRestDays(rows, "2026-07-04")).toBe(2);
  });

  it("counts missing rows as rest days", () => {
    const rows = [{ entry_date: "2026-07-02", workouts_completed: 1 }];
    expect(countConsecutiveRestDays(rows, "2026-07-04")).toBe(2);
  });
});

describe("buildChatSystemPrompt (Kai)", () => {
  const sampleLocales = ["tr", "en", "de", "fr", "ar", "ja", "hi", "pt", "es-mx", "zh-CN"] as const;

  it.each(sampleLocales)("includes accountability + native locale for %s", (locale) => {
    const prompt = buildChatSystemPrompt({
      coachId: "kai",
      coachName: "Kai",
      coachPersonality: "Warm teammate.",
      locale,
      stateSummary: "consecutive days without gym: 5",
    });

    expect(prompt).toContain("KAI ACCOUNTABILITY");
    expect(prompt).toContain("DO NOT say 'okay skip it'");
    expect(prompt).toContain(`locale ("${locale}")`);
    expect(prompt).toContain("consecutive days without gym: 5");
    expect(prompt).not.toContain("kanka");
    expect(prompt).not.toContain("nasılsın");
  });
});
