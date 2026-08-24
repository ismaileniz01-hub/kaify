import { describe, expect, it } from "vitest";
import {
  equipmentCatalogCandidates,
  resolveEquipmentPreference,
} from "@/lib/kaios/tools/dispatch";
import { scrubAlexGenderedAddress } from "@/lib/kaios/coach-retry";

describe("Alex personalization guards", () => {
  it("lets the newest chat equipment preference override the profile", () => {
    expect(
      resolveEquipmentPreference({
        userState: "equipment_access: gym",
        memoryItems: ["equipment: home / limited"],
      }),
    ).toBe("home");
  });

  it("builds home-only candidates across the exercise library", () => {
    const candidates = equipmentCatalogCandidates("home");
    expect(candidates.length).toBeGreaterThan(8);
    expect(candidates.every((item) => item.equipment === "home")).toBe(true);
    expect(candidates.every((item) => item.id.startsWith("home_"))).toBe(true);
    expect(new Set(candidates.map((item) => item.muscle)).size).toBeGreaterThan(3);
  });

  it("removes masculine Turkish addresses for female users", () => {
    expect(
      scrubAlexGenderedAddress({
        text: "Hadi kralım, bugün programı bitiriyoruz bro.",
        locale: "tr",
        userGender: "female",
      }),
    ).toBe("Hadi kraliçe, bugün programı bitiriyoruz kraliçe.");
  });

  it("does not alter the same address for a male user", () => {
    expect(
      scrubAlexGenderedAddress({
        text: "Hadi kral, başlıyoruz.",
        locale: "tr",
        userGender: "male",
      }),
    ).toBe("Hadi kral, başlıyoruz.");
  });
});
