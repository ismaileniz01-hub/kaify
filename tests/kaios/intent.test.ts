import { describe, expect, it } from "vitest";
import {
  needsStructuredOutput,
  outputBudgetFor,
  resolveIntent,
  type CoachId,
  type Intent,
} from "@/lib/kaios/routing/intent";

describe("resolveIntent", () => {
  it("routes short greetings to casual for kai", () => {
    expect(
      resolveIntent({ coach: "kai", message: "Selam, nasılsın?" }),
    ).toBe("casual");
    expect(resolveIntent({ coach: "kai", message: "hey" })).toBe("casual");
    expect(
      resolveIntent({ coach: "kai", message: "nasılsın?" }),
    ).toBe("casual");
  });

  it("does not treat short how/nasıl follow-ups as a greeting", () => {
    expect(resolveIntent({ coach: "kai", message: "nasıl?" })).toBe("unknown");
    expect(resolveIntent({ coach: "kai", message: "nasil?" })).toBe("unknown");
    expect(resolveIntent({ coach: "kai", message: "how?" })).toBe("unknown");
    expect(resolveIntent({ coach: "kai", message: "peki?" })).toBe("unknown");
  });

  it("routes motivation cues for kai", () => {
    expect(
      resolveIntent({ coach: "kai", message: "Bugün salona gidesim yok." }),
    ).toBe("motivation");
    expect(
      resolveIntent({
        coach: "kai",
        message: "I'm tired and don't want to go to the gym",
      }),
    ).toBe("motivation");
  });

  it("routes form / programming for alex", () => {
    expect(
      resolveIntent({
        coach: "alex",
        message: "How do I squat with good form?",
      }),
    ).toBe("exercise_form");
    expect(
      resolveIntent({
        coach: "alex",
        message: "How deep should I squat?",
      }),
    ).toBe("exercise_form");
    expect(
      resolveIntent({
        coach: "alex",
        message: "Can you build me a 4-day workout program?",
      }),
    ).toBe("programming");
    expect(
      resolveIntent({
        coach: "alex",
        message: "tamam gunleri ve antrenmanlari yazarmisin",
      }),
    ).toBe("programming");
    expect(
      resolveIntent({
        coach: "alex",
        message: "?",
        previousAssistantMessage:
          "Tamam kral, 5 günlük split hazır. Göğüs ve sırt zayıf, PPL + üst + alt kurdum. Forma dikkat.",
        hasRecentHistory: true,
      }),
    ).toBe("programming");
    expect(
      resolveIntent({ coach: "alex", message: "antrenman bitti" }),
    ).toBe("motivation");
    expect(
      resolveIntent({ coach: "alex", message: "antrenmanı bitirdim" }),
    ).toBe("motivation");
  });

  it("keeps Alex programming on elliptical answers to a program interview", () => {
    expect(
      resolveIntent({
        coach: "alex",
        message: "4 gün",
        previousAssistantMessage:
          "Haftada kaç gün gelebiliyorsun? Programı ona göre yazayım.",
        hasRecentHistory: true,
      }),
    ).toBe("programming");
    expect(
      resolveIntent({
        coach: "alex",
        message: "5 gun",
        previousAssistantMessage:
          "Haftada kaç gün gidebilirsin? Ekipman durumun ne?",
        hasRecentHistory: true,
      }),
    ).toBe("programming");
  });

  it("does not re-program when user thanks or oks after a delivered weekly list", () => {
    const delivered = `
Kral, işte 5 günlük programın:

Pazartesi – Göğüs + Triceps
• Bench Press: 4x8
• Incline Dumbbell Press: 3x10

Salı – Sırt + Biceps
• Deadlift: 4x6
• Lat Pulldown: 4x10

Perşembe – Omuz + Karın
• Overhead Press: 4x8

Cuma – Bacak + Karın
• Squat: 4x8

Cumartesi – Üst Vücut
• Bench Press: 3x8

Forma dikkat, ego yapma.
`.trim();
    expect(
      resolveIntent({
        coach: "alex",
        message: "sagol",
        previousAssistantMessage: delivered,
        hasRecentHistory: true,
      }),
    ).toBe("casual");
    expect(
      resolveIntent({
        coach: "alex",
        message: "tamamdir",
        previousAssistantMessage: delivered,
        hasRecentHistory: true,
      }),
    ).toBe("casual");
    expect(
      needsStructuredOutput(
        resolveIntent({
          coach: "alex",
          message: "sağol",
          previousAssistantMessage: delivered,
          hasRecentHistory: true,
        }),
      ),
    ).toBe(false);
  });

  it("routes Turkish weekly menu phrasing to meal_plan for Maya", () => {
    expect(
      resolveIntent({
        coach: "maya",
        message: "bana haftalık menü hazırla",
      }),
    ).toBe("meal_plan");
  });

  it("routes nutrition and meal analysis for maya", () => {
    expect(
      resolveIntent({
        coach: "maya",
        message: "How much protein should I eat?",
      }),
    ).toBe("nutrition_question");
    expect(
      resolveIntent({
        coach: "maya",
        message: "1 hatay doner gomdum",
      }),
    ).toBe("nutrition_question");
    expect(
      resolveIntent({
        coach: "maya",
        message: "What is on my plate?",
        hasImage: true,
      }),
    ).toBe("meal_analysis");
    expect(
      resolveIntent({
        coach: "maya",
        message: "Make me a weekly meal plan",
      }),
    ).toBe("meal_plan");
  });

  it("keeps Maya water yes as hydration instead of continuing a meal plan", () => {
    expect(
      resolveIntent({
        coach: "maya",
        message: "evet",
        previousAssistantMessage:
          "Kalori 280. Öğünden sonra bir bardak su içmeyi unutma.",
        hasRecentHistory: true,
      }),
    ).toBe("hydration");
  });

  it("keeps Maya liter water logs as hydration after a food estimate", () => {
    expect(
      resolveIntent({
        coach: "maya",
        message: "1 litre de su ictim",
        previousAssistantMessage:
          "Toplam tahmini: ~1400-1600 kcal, 55-65g protein. Analize eklememi onaylıyor musun?",
        hasRecentHistory: true,
      }),
    ).toBe("hydration");
  });

  it("treats Maya save-follow-ups as nutrition, not a new meal plan", () => {
    expect(
      resolveIntent({
        coach: "maya",
        message: "yemegi analize ekledin mi",
        previousAssistantMessage:
          "Toplam tahmini: ~1400 kcal, 60g protein. Analize eklememi onaylıyor musun?",
        hasRecentHistory: true,
      }),
    ).toBe("nutrition_question");
  });

  it("respects workflow/route overrides for council", () => {
    expect(
      resolveIntent({
        coach: "council",
        message: "What should we do this week?",
      }),
    ).toBe("council_turn");
    expect(
      resolveIntent({
        coach: "kai",
        message: "Finalize the plan",
        workflow: "council_decision",
      }),
    ).toBe("council_decision");
  });
});

describe("resolveIntent paraphrase corpus (beyond exact keywords)", () => {
  const cases: Array<{
    coach: CoachId;
    message: string;
    hasImage?: boolean;
    expect: Intent;
  }> = [
    // exercise_form vs programming
    {
      coach: "alex",
      message: "My knees cave in on squats — what should I fix?",
      expect: "exercise_form",
    },
    {
      coach: "alex",
      message: "Should my elbows flare on bench?",
      expect: "exercise_form",
    },
    {
      coach: "alex",
      message: "Am I supposed to touch my chest on bench press?",
      expect: "exercise_form",
    },
    {
      coach: "alex",
      message: "Cue me through a deadlift setup",
      expect: "exercise_form",
    },
    {
      coach: "alex",
      message: "What stance width for sumo deadlift?",
      expect: "exercise_form",
    },
    {
      coach: "alex",
      message: "How far should I go down in the squat?",
      expect: "exercise_form",
    },
    {
      coach: "alex",
      message: "Build me an upper/lower split for hypertrophy",
      expect: "programming",
    },
    {
      coach: "alex",
      message: "I need a push pull legs schedule",
      expect: "programming",
    },
    {
      coach: "alex",
      message: "How should I progress my bench over 8 weeks?",
      expect: "programming",
    },
    {
      coach: "alex",
      message: "Give me sets and reps for incline press",
      expect: "programming",
    },
    {
      coach: "alex",
      message: "Design my next mesocycle",
      expect: "programming",
    },
    {
      coach: "alex",
      message: "I am tired, build me an easy workout",
      expect: "programming",
    },
    // motivation vs training
    {
      coach: "kai",
      message: "I keep skipping the gym, help",
      expect: "motivation",
    },
    {
      coach: "kai",
      message: "Feeling drained and unmotivated lately",
      expect: "motivation",
    },
    {
      coach: "kai",
      message: "I want to quit training forever",
      expect: "motivation",
    },
    {
      coach: "kai",
      message: "Can you push me a bit today?",
      expect: "motivation",
    },
    // nutrition chat vs meal analysis
    {
      coach: "maya",
      message: "Is rice good after training?",
      expect: "nutrition_question",
    },
    {
      coach: "maya",
      message: "Describe this meal",
      expect: "nutrition_question",
    },
    {
      coach: "maya",
      message: "I ate chicken and rice, how many calories roughly?",
      expect: "nutrition_question",
    },
    {
      coach: "maya",
      message: "Estimate macros for this plate",
      hasImage: true,
      expect: "meal_analysis",
    },
    {
      coach: "maya",
      message: "What did I eat in this photo?",
      hasImage: true,
      expect: "meal_analysis",
    },
    {
      coach: "maya",
      message: "Plan my dinners for the week",
      expect: "meal_plan",
    },
    // casual Kai vs specialist routing
    {
      coach: "kai",
      message: "Good morning!",
      expect: "casual",
    },
    {
      coach: "kai",
      message: "How much protein do I need?",
      expect: "nutrition_question",
    },
    {
      coach: "kai",
      message: "How do I squat properly?",
      expect: "exercise_form",
    },
    {
      coach: "alex",
      message: "hey",
      expect: "casual",
    },
    {
      coach: "maya",
      message: "hi maya",
      expect: "casual",
    },
  ];

  it.each(cases)(
    "$coach ← $message → $expect",
    ({ coach, message, hasImage, expect: expected }) => {
      expect(resolveIntent({ coach, message, hasImage })).toBe(expected);
    },
  );
});

describe("needsStructuredOutput / outputBudgetFor", () => {
  it("flags analysis and plan intents as structured", () => {
    expect(needsStructuredOutput("meal_analysis")).toBe(true);
    expect(needsStructuredOutput("programming")).toBe(true);
    expect(needsStructuredOutput("casual")).toBe(false);
    expect(needsStructuredOutput("motivation")).toBe(false);
  });

  it("maps budgets to casual/support/detailed bands", () => {
    expect(outputBudgetFor("casual")).toBe(120);
    expect(outputBudgetFor("motivation")).toBe(160);
    expect(outputBudgetFor("nutrition_question")).toBe(220);
    expect(outputBudgetFor("nutrition_question", "1 hatay doner gomdum")).toBe(
      400,
    );
    expect(outputBudgetFor("meal_plan")).toBe(800);
    expect(outputBudgetFor("meal_analysis")).toBe(650);
    expect(outputBudgetFor("casual", "hi")).toBe(80);
    expect(outputBudgetFor("casual", "bugün de aynı boktan gün")).toBe(120);
    expect(outputBudgetFor("unknown", "hatırlıyor musun geçen hafta")).toBe(180);
  });
});
