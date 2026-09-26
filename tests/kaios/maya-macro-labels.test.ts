import { describe, expect, it } from "vitest";
import { relabelMayaMacroLabels } from "@/lib/kaios/maya/macro-labels";

const SHAWARMA = `That looks like a solid meal! For a typical shawarma wrap I'd estimate around:

• Kalori: ~600 kcal
• Protein: ~35 g
• Karbonhidrat: ~60 g
• Yağ: ~25 g

Want me to add this to analytics?`;

describe("relabelMayaMacroLabels", () => {
  it("rewrites Turkish list labels when the app language is English", () => {
    const out = relabelMayaMacroLabels({
      text: SHAWARMA,
      locale: "en",
      coachId: "maya",
    });
    expect(out).toContain("Calories: ~600 kcal");
    expect(out).toContain("Carbs: ~60 g");
    expect(out).toContain("Fat: ~25 g");
    expect(out).not.toContain("Kalori:");
    expect(out).not.toContain("Karbonhidrat:");
    expect(out).not.toContain("Yağ:");
    expect(out).toContain("Want me to add this to analytics?");
  });

  it("rewrites English list labels when the app language is Turkish", () => {
    const out = relabelMayaMacroLabels({
      text: "Calories: 600\nCarbs: 60\nFat: 25\nTotal: 600",
      locale: "tr",
      coachId: "maya",
    });
    expect(out).toContain("Kalori: 600");
    expect(out).toContain("Karbonhidrat: 60");
    expect(out).toContain("Yağ: 25");
    expect(out).toContain("Toplam: 600");
  });

  it("does not rewrite fat inside running English copy", () => {
    const text = "That wrap is a bit high in fat, but the protein is solid.";
    expect(
      relabelMayaMacroLabels({ text, locale: "en", coachId: "maya" }),
    ).toBe(text);
  });

  it("skips other coaches", () => {
    expect(
      relabelMayaMacroLabels({
        text: "Kalori: 600",
        locale: "en",
        coachId: "alex",
      }),
    ).toBe("Kalori: 600");
  });
});
