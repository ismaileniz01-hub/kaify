import { describe, expect, it } from "vitest";
import {
  findLatestPinnableMessage,
  isAlexProgramMessage,
  isLeoAnalysisMessage,
  pinnedCardMetric,
} from "@/lib/chat/pinned-card";

const ALEX_DAYS = {
  ui: {
    cardType: "workout_plan",
    days: [
      {
        dayKey: "Pazartesi",
        focus: "Push",
        exercises: [{ name: "Bench press", sets: 4, reps: "8" }],
      },
    ],
  },
};

const LEO_SCORES = {
  analysis: {
    overall_score: 64,
    scores: { chests: 70, back: 48 },
  },
};

describe("pinned chat cards", () => {
  it("pins Alex program days and ignores casual text", () => {
    expect(
      isAlexProgramMessage({
        from: "coach",
        messageType: "workout_plan",
        payload: ALEX_DAYS,
      }),
    ).toBe(true);
    expect(
      isAlexProgramMessage({
        from: "coach",
        messageType: "text",
        text: "selam, nasıl gidiyor?",
      }),
    ).toBe(false);
    expect(pinnedCardMetric("alex", { from: "coach", payload: ALEX_DAYS })).toBe("1");
  });

  it("pins Leo score cards only", () => {
    expect(
      isLeoAnalysisMessage({
        from: "coach",
        messageType: "score",
        payload: LEO_SCORES,
      }),
    ).toBe(true);
    expect(
      isLeoAnalysisMessage({
        from: "coach",
        messageType: "text",
        payload: LEO_SCORES,
      }),
    ).toBe(false);
    expect(
      pinnedCardMetric("leo", { from: "coach", payload: LEO_SCORES }),
    ).toBe("64");
  });

  it("keeps the latest eligible card", () => {
    const pinned = findLatestPinnableMessage("alex", [
      { from: "coach", payload: ALEX_DAYS, text: "eski" },
      { from: "user", text: "tamam" },
      {
        from: "coach",
        payload: {
          ui: {
            cardType: "workout_plan",
            days: [
              {
                day: "Salı",
                focus: "Pull",
                exercises: [{ name: "Row", sets: 3, reps: "10" }],
              },
              {
                day: "Çarşamba",
                focus: "Legs",
                exercises: [{ name: "Squat", sets: 4, reps: "8" }],
              },
            ],
          },
        },
        text: "yeni",
      },
    ]);
    expect(pinned?.text).toBe("yeni");
    expect(pinnedCardMetric("alex", pinned!)).toBe("2");
  });

  it("does not pin Maya or Kai chats", () => {
    expect(
      findLatestPinnableMessage("maya", [
        { from: "coach", messageType: "meal_plan", payload: { meals: [] } },
      ]),
    ).toBeNull();
    expect(
      findLatestPinnableMessage("kai", [
        { from: "coach", messageType: "text", text: "kral" },
      ]),
    ).toBeNull();
  });
});
