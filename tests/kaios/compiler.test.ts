import { describe, expect, it } from "vitest";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import { compilePrompt } from "@/lib/kaios/compiler/prompt";
import { CORE_CAPSULE, SAFETY_CAPSULE, KAI_CORE } from "@/lib/kaios/capsules";
import { prioritizeTrustedUserState } from "@/lib/kaios/context/safety-state";

describe("compilePrompt (casual kai)", () => {
  it("builds a lean prompt with stable order and bounded tokens", () => {
    const ctx = buildRuntimeContext({
      coach: "kai",
      message: "Selam, nasılsın?",
      locale: "tr",
      // Even if callers pass extras, casual tier should drop them.
      userState: "motivation style: tough love; streak: 3",
      memoryItems: ["likes morning lifts", "avoiding sugar"],
      teamFacts: ["Alex owns strength programming"],
      knowledge: ["squat depth cues"],
      conversationTurns: [
        { role: "user", content: "dün antrenman yaptım" },
        { role: "assistant", content: "Harika, nasıldı?" },
      ],
    });

    expect(ctx.intent).toBe("casual");
    expect(ctx.tier).toBe(0);
    expect(ctx.userState).toBeUndefined();
    expect(ctx.memoryItems).toBeUndefined();
    expect(ctx.conversationTurns).toBeUndefined();

    const compiled = compilePrompt(ctx);
    const system = compiled.messages[0];
    expect(system?.role).toBe("system");

    const blob = compiled.messages.map((m) => m.content).join("\n");
    expect(blob).not.toContain("Kaify AI Operating System —");

    // Exactly one active coach identity (Kai layered capsules), not the full roster.
    expect(blob).toContain(KAI_CORE);
    expect(blob).toMatch(/^kai\.identity:\s*$/m);
    expect(blob).not.toMatch(/^alex\.identity:\s*$/m);
    expect(blob).not.toMatch(/^maya\.identity:\s*$/m);
    expect(blob).not.toMatch(/^leo\.identity:\s*$/m);

    expect(compiled.cache.hitRatio).toBeGreaterThanOrEqual(0.8);
    expect(compiled.breakdown.total).toBeLessThan(9000);
    expect(compiled.canary).toMatch(/^KFY-/);

    // Message order: system first, then current user (no history at tier 0).
    expect(compiled.messages.length).toBe(2);
    expect(compiled.messages[0]?.role).toBe("system");
    expect(compiled.messages[1]?.role).toBe("user");

    // System prefix order: safety → core → coach capsules → locale…
    const sys = system!.content;
    const coreIdx = sys.indexOf(CORE_CAPSULE.slice(0, 20));
    const safetyIdx = sys.indexOf(SAFETY_CAPSULE.slice(0, 20));
    const coachIdx = sys.indexOf("kai.identity:");
    const localeIdx = sys.indexOf("kaios.localization:");
    expect(safetyIdx).toBeGreaterThanOrEqual(0);
    expect(coreIdx).toBeGreaterThan(safetyIdx);
    expect(coachIdx).toBeGreaterThan(coreIdx);
    expect(localeIdx).toBeGreaterThan(coachIdx);

    // Canary lives on the current user turn, not the cacheable system prefix.
    expect(sys).not.toContain(compiled.canary);
    expect(compiled.messages[1]?.content).toContain(compiled.canary);
    expect(compiled.messages[1]?.content).toContain("<<<BEGIN_USER_MESSAGE_");
    expect(compiled.messages[1]?.content).toContain("REPLY LANGUAGE");
    expect(compiled.messages[1]?.content).toContain("Turkish");
  });
});

describe("USER_CONTEXT budget keeps teammate facts", () => {
  it("does not drop leo_lagging when general fitness prose is huge", () => {
    const fluff = `app check-in streak: 12 days; ${"gym skip note ".repeat(200)}`;
    const raw = `${fluff}; leo_lagging: back,calves; calorie_goal: 2100; water_today_l: 0.8/2.5`;
    expect(raw.length).toBeGreaterThan(2000);
    const kept = prioritizeTrustedUserState(raw, 2000);
    expect(kept).toContain("leo_lagging: back,calves");
    expect(kept).toContain("calorie_goal: 2100");
    expect(kept).toContain("water_today_l: 0.8/2.5");
    const ctx = buildRuntimeContext({
      coach: "alex",
      message: "haftalik program hazirla",
      locale: "tr",
      userState: raw,
    });
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("leo_lagging: back,calves");
    expect(blob).toContain("calorie_goal: 2100");
  });

  it("keeps TEAM_FACTS on history turns below programming tier", () => {
    const ctx = buildRuntimeContext({
      coach: "kai",
      message: "bugün ne yesem",
      locale: "tr",
      teamFacts: ["alex_last_plan: Push | Pull", "leo_lagging: back"],
      conversationTurns: [
        { role: "user", content: "dün antrenman yaptım" },
        { role: "assistant", content: "Harika, nasıldı?" },
      ],
    });
    expect(ctx.tier).toBeGreaterThanOrEqual(1);
    expect(ctx.teamFacts?.join(" ")).toContain("alex_last_plan: Push | Pull");
    const blob = compilePrompt(ctx)
      .messages.map((m) => m.content)
      .join("\n");
    expect(blob).toContain("alex_last_plan: Push | Pull");
    expect(blob).toContain("leo_lagging: back");
  });
});
