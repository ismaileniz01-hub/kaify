import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyHighRiskMessage,
  highRiskSafetyResponse,
} from "@/lib/ai/high-risk-safety";
import {
  CircuitOpenError,
  __resetAllCircuits,
  __setCircuitSharedDisabled,
  withCircuit,
} from "@/lib/resilience/circuit";
import { UpstreamHttpError } from "@/lib/resilience/error-taxonomy";

describe("deterministic high-risk safety routing", () => {
  it.each([
    ["I plan to kill myself tonight", "self_harm_imminent"],
    ["Kendimi öldürmek istiyorum", "self_harm_imminent"],
    ["I have crushing chest pain and can't breathe", "medical_emergency"],
    ["Şiddetli göğüs ağrısı var, nefes alamıyorum", "medical_emergency"],
    ["I force myself to vomit after every meal", "eating_disorder_crisis"],
    ["3 gündür hiç yemiyorum", "eating_disorder_crisis"],
  ] as const)("classifies %s before any model call", (message, expected) => {
    expect(classifyHighRiskMessage(message)).toBe(expected);
  });

  it.each([
    "How many reps should I do?",
    "My heart rate was 150 bpm during intervals",
    "I want to cut for my competition safely",
    "Suicide grip is a term I saw in a lifting video",
  ])("does not route ordinary fitness context: %s", (message) => {
    expect(classifyHighRiskMessage(message)).toBeNull();
  });

  it("returns fixed emergency guidance without echoing user content", () => {
    const response = highRiskSafetyResponse("medical_emergency", "en");
    expect(response).toContain("call your local emergency number now");
    expect(response).not.toContain("chest pain");
  });

  it("returns Turkish emergency guidance when the locale is Turkish", () => {
    expect(
      highRiskSafetyResponse("self_harm_imminent", "tr"),
    ).toContain("112");
  });
});

describe("F3-10 high-risk routing survives a provider outage", () => {
  it("classifies and answers without calling the model when the circuit is open", async () => {
    __setCircuitSharedDisabled(true);
    __resetAllCircuits();
    for (let i = 0; i < 3; i += 1) {
      await expect(
        withCircuit("deepseek", async () => {
          throw new UpstreamHttpError(503, "provider down", "deepseek");
        }),
      ).rejects.toBeInstanceOf(UpstreamHttpError);
    }
    await expect(
      withCircuit("deepseek", async () => "should not run"),
    ).rejects.toBeInstanceOf(CircuitOpenError);

    expect(classifyHighRiskMessage("I plan to kill myself tonight")).toBe(
      "self_harm_imminent",
    );
    expect(highRiskSafetyResponse("self_harm_imminent", "en")).toContain(
      "call your local emergency or crisis service now",
    );
    __resetAllCircuits();
  });

  it("keeps the high-risk check before any KAIOS or legacy model path", () => {
    const src = readFileSync(join(process.cwd(), "lib/services/chat.service.ts"), "utf8");
    const highRisk = src.indexOf("classifyHighRiskMessage(params.message)");
    const kaios = src.indexOf("if (AI_FEATURES.kaiosRuntime)");
    const legacy = src.indexOf("kaios.runtime.rollback_active");
    expect(highRisk).toBeGreaterThan(0);
    expect(kaios).toBeGreaterThan(highRisk);
    expect(legacy).toBeGreaterThan(kaios);
  });
});
