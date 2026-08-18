import { describe, expect, it } from "vitest";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import {
  ALEX_CORE,
  MAYA_CORE,
  LEO_CORE,
  KAI_CORE,
} from "@/lib/kaios/capsules";
import { CONTEXT_BUDGET } from "@/lib/ai/budget";

describe("one active coach identity / persona leakage", () => {
  it("Alex program prompt includes only Alex core identity, not Maya/Leo/Kai cores", () => {
    const ctx = buildRuntimeContext({
      coach: "alex",
      message: "Build me a workout program",
      locale: "en",
      teamFacts: ["Maya owns nutrition"],
    });
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain(ALEX_CORE);
    expect(blob).not.toContain(MAYA_CORE);
    expect(blob).not.toContain(LEO_CORE);
    expect(blob).not.toContain(KAI_CORE);
  });

  it("Maya nutrition prompt excludes Alex programming capsules", () => {
    const ctx = buildRuntimeContext({
      coach: "maya",
      message: "How many carbs at dinner?",
      locale: "en",
    });
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain(MAYA_CORE);
    expect(blob).not.toContain(ALEX_CORE);
  });
});

describe("character stability markers", () => {
  it("each coach core keeps a stable role marker", () => {
    expect(ALEX_CORE).toMatch(/role:/i);
    expect(MAYA_CORE).toMatch(/role:/i);
    expect(LEO_CORE).toMatch(/role:/i);
    expect(KAI_CORE).toMatch(/role:/i);
  });
});

describe("long-history bounded context", () => {
  it("does not inject unbounded conversation turns at casual tier", () => {
    const turns = Array.from({ length: 40 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `turn-${i} `.repeat(40),
    }));
    const ctx = buildRuntimeContext({
      coach: "kai",
      message: "hi",
      locale: "en",
      conversationTurns: turns,
    });
    expect(ctx.conversationTurns).toBeUndefined();
    expect(compilePrompt(ctx).messages.length).toBe(2);
  });

  it("keeps recent history for short nasıl/how follow-ups", () => {
    const ctx = buildRuntimeContext({
      coach: "kai",
      message: "nasıl?",
      locale: "tr",
      conversationTurns: [
        { role: "user", content: "bugun spora gitmek istemiyorum" },
        {
          role: "assistant",
          content: "Gel, 20 dakika. Gerisini ben hallederim.",
        },
      ],
    });
    expect(ctx.intent).toBe("unknown");
    expect(ctx.conversationTurns?.length).toBe(2);
  });

  it("history budget env stays finite for product chat", () => {
    expect(CONTEXT_BUDGET.historyTurns).toBeLessThanOrEqual(20);
    expect(CONTEXT_BUDGET.historyUserChars).toBeLessThanOrEqual(2000);
    expect(CONTEXT_BUDGET.historyCoachChars).toBeLessThanOrEqual(2000);
  });
});

describe("canonical state precedence over memory prose", () => {
  it("trusted userState is wrapped as DATA and memory is capped", () => {
    const ctx = buildRuntimeContext({
      coach: "maya",
      message: "Am I hitting protein?",
      locale: "en",
      userState: "protein_goal_g: 160; protein_today_g: 90",
      memoryItems: [
        "User said protein goal is 999 (stale)",
        "Prefers Greek yogurt",
        "Avoids late caffeine",
        "Likes eggs",
        "Training days Mon/Wed/Fri",
        "Should be dropped by limit",
      ],
    });
    expect(ctx.memoryItems?.length).toBeLessThanOrEqual(5);
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toMatch(/USER_CONTEXT/);
    expect(blob).toMatch(/protein_goal_g: 160/);
  });

  it("programming prompts keep onboarding goal/days/experience and forbid re-asking", () => {
    const ctx = buildRuntimeContext({
      coach: "alex",
      message: "bana haftalik program hazirlar misin",
      locale: "tr",
      userState:
        "experience_level: intermediate; training_days_per_week: 4; primary_goal: build_muscle",
    });
    expect(ctx.intent).toBe("programming");
    expect(ctx.userState).toContain("experience_level: intermediate");
    expect(ctx.userState).toContain("training_days_per_week: 4");
    expect(ctx.userState).toContain("primary_goal: build_muscle");
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("never interview for those again");
    expect(blob).toContain("do not re-ask fields already present");
  });

  it("Alex programming uses Leo lagging body parts from USER_CONTEXT", () => {
    const ctx = buildRuntimeContext({
      coach: "alex",
      message: "haftalik program hazirla",
      locale: "tr",
      userState:
        "primary_goal: build_muscle; training_days_per_week: 4; leo_lagging: back,calves; leo_priority: back",
    });
    expect(ctx.intent).toBe("programming");
    expect(ctx.userState).toContain("leo_lagging: back,calves");
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("leo_lagging");
    expect(blob).toContain("bias weekly volume toward those groups");
  });

  it("Maya meal-plan prompts keep calorie/protein goals and goal-based planning", () => {
    const ctx = buildRuntimeContext({
      coach: "maya",
      message: "hazirla bana bir meal plan, yag yakimi icin",
      locale: "tr",
      userState:
        "primary_goal: lose_weight; calorie_goal: 2100; protein_goal_g: 150; dietary_preference: omnivore",
    });
    expect(ctx.intent).toBe("meal_plan");
    expect(ctx.userState).toContain("calorie_goal: 2100");
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("calorie_goal");
    expect(blob).toContain("never invent a different calorie/protein target");
  });

  it("Kai motivation references teammate facts when present", () => {
    const ctx = buildRuntimeContext({
      coach: "kai",
      message: "spora gitmek istemiyorum",
      locale: "tr",
      userState:
        "primary_goal: lose_weight; leo_lagging: back; alex_last_plan: Push | Pull | Legs; calorie_goal: 2100",
    });
    expect(ctx.userState).toContain("leo_lagging: back");
    expect(ctx.userState).toContain("alex_last_plan");
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("teammate_read");
  });
});

describe("coaches act on each other's product facts", () => {
  const snapshot =
    "primary_goal: build_muscle; training_days_per_week: 4; leo_lagging: back,calves; leo_priority: back; alex_last_plan: Push | Pull | Legs; alex_last_workout: Pull; calorie_goal: 2100; protein_goal_g: 150; calories_today: 900/2100";

  it("Maya meal plans around Alex's split and Leo lagging, not a generic menu", () => {
    const ctx = buildRuntimeContext({
      coach: "maya",
      message: "haftalik yemek programi hazirla",
      locale: "tr",
      userState: snapshot,
    });
    expect(ctx.intent).toBe("meal_plan");
    expect(ctx.userState).toContain("alex_last_plan: Push | Pull | Legs");
    expect(ctx.userState).toContain("leo_lagging: back,calves");
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("alex_last_plan");
    expect(blob).toContain("time carbs around training days");
    expect(blob).toContain("keep protein_goal_g as the floor");
  });

  it("Leo scoring reads Alex's split and Maya's energy context", () => {
    const ctx = buildRuntimeContext({
      coach: "leo",
      message: "bu fotografa gore skorla",
      locale: "tr",
      hasImage: true,
      userState: snapshot,
    });
    expect(ctx.userState).toContain("alex_last_plan");
    expect(ctx.userState).toContain("calorie_goal: 2100");
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("judge lagging groups against that split");
    expect(blob).toContain("interpret physique trend with that energy context");
  });

  it("Alex form/session still uses Leo lagging and Maya fuel", () => {
    const ctx = buildRuntimeContext({
      coach: "alex",
      message: "bench form nasil duzeltilir",
      locale: "tr",
      userState: snapshot,
    });
    expect(ctx.userState).toContain("leo_lagging: back,calves");
    expect(ctx.userState).toContain("calories_today: 900/2100");
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("teammate_work");
    expect(blob).toContain("bias today's volume and cues toward those groups");
    expect(blob).toContain("treat them as fuel truth");
  });

  it("keeps Alex last workout on a casual Kai greeting", () => {
    const ctx = buildRuntimeContext({
      coach: "kai",
      message: "selam",
      locale: "tr",
      userState: `${snapshot}; motivation style: tough`,
    });
    expect(ctx.tier).toBe(0);
    expect(ctx.userState).toContain("alex_last_workout: Pull");
    expect(ctx.userState).not.toMatch(/motivation style/);
  });
});

describe("Maya confirmation-before-save contract in capsules", () => {
  it("food analysis capsule forbids silent save claims", () => {
    const ctx = buildRuntimeContext({
      coach: "maya",
      message: "Analyze this meal photo",
      locale: "en",
      hasImage: true,
    });
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toMatch(/ask_before_saving|never_claim_save|confirmation/i);
  });
});
