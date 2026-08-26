import { describe, expect, it } from "vitest";
import {
  classifyHighRiskMessage,
  highRiskSafetyResponse,
} from "@/lib/ai/high-risk-safety";

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
