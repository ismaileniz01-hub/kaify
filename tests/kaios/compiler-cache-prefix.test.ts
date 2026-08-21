import { describe, expect, it } from "vitest";
import { buildRuntimeContext } from "@/lib/kaios/context/builder";
import {
  compilePrompt,
  DEEPSEEK_PREFIX_HIT_TARGET,
} from "@/lib/kaios/compiler/prompt";
import { selectCacheStableCapsules } from "@/lib/kaios/capsules";

describe("DeepSeek cache-stable prefix", () => {
  it("keeps system[0] identical across intent, user state, and the user message", () => {
    const coach = "maya" as const;
    const locale = "tr";
    const a = compilePrompt(
      buildRuntimeContext({
        coach,
        locale,
        message: "selam",
      }),
    );
    const b = compilePrompt(
      buildRuntimeContext({
        coach,
        locale,
        message: "lahmacun yedim",
        userState: "calorie_goal: 2100; water_today_l: 0.8/2.5",
        conversationTurns: [
          { role: "user", content: "dün ne yesem" },
          { role: "assistant", content: "Proteinli bir tabak." },
        ],
      }),
    );
    expect(a.messages[0]?.role).toBe("system");
    expect(a.messages[0]?.content).toBe(b.messages[0]?.content);
    expect(a.messages[0]?.content).toContain("kaios.cache.v1");
    expect(a.messages[0]?.content).not.toContain("calorie_goal: 2100");
    expect(b.messages.map((m) => m.content).join("\n")).toContain(
      "calorie_goal: 2100",
    );
  });

  it("meets the 80% prefix-hit budget on typical warm turns", () => {
    const compiled = compilePrompt(
      buildRuntimeContext({
        coach: "kai",
        locale: "tr",
        message: "kanka bugün salona gitmek içimden gelmiyor",
        userState: "calorie_goal: 2100; water_today_l: 0.8/2.5",
        conversationTurns: [
          { role: "user", content: "selam" },
          { role: "assistant", content: "Naber, nasılsın?" },
        ],
      }),
    );
    expect(compiled.cache.hitRatio).toBeGreaterThanOrEqual(
      DEEPSEEK_PREFIX_HIT_TARGET,
    );
  });

  it("does not change the Maya cache prefix when the task switches", () => {
    const food = compilePrompt(
      buildRuntimeContext({
        coach: "maya",
        locale: "en",
        message: "I ate a burger",
      }),
    );
    const plan = compilePrompt(
      buildRuntimeContext({
        coach: "maya",
        locale: "en",
        message: "Build me a weekly meal plan",
      }),
    );
    expect(food.messages[0]?.content).toBe(plan.messages[0]?.content);
    expect(selectCacheStableCapsules("maya").join("\n")).toContain(
      "maya.mode.food_log",
    );
    expect(selectCacheStableCapsules("maya").join("\n")).toContain(
      "maya.mode.meal_planning",
    );
  });
});
