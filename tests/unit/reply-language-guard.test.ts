import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isReplyLanguageMismatch } from "@/lib/i18n/reply-language-guard";
import { stripMedicalDisclaimer } from "@/lib/kaios/coach-retry";
import { stripWrittenScoreDump } from "@/lib/chat/score-message-text";

describe("reply language guard", () => {
  it("rejects a substantial English reply for a Turkish account", () => {
    expect(
      isReplyLanguageMismatch(
        "You should keep your workout simple today and focus on controlled repetitions. Start with a short warmup, complete the main exercises, and finish with an easy cooldown.",
        "tr",
      ),
    ).toBe(true);
  });

  it("accepts a natural Turkish reply with English exercise names", () => {
    expect(
      isReplyLanguageMismatch(
        "Bugünkü antrenmanı sade tutalım. Bench press sırasında kontrollü tekrar yap, ardından evde uygulayabileceğin şınav ve squat hareketleriyle programı tamamla.",
        "tr",
      ),
    ).toBe(false);
  });

  it("rejects a Turkish reply that continues in English sentences", () => {
    expect(
      isReplyLanguageMismatch(
        "Bugün antrenmanı sade tutalım. Worth noting against Alex's split: shoulders get their own day and the two groups we flagged aren't being ignored in the plan because they're just behind.",
        "tr",
      ),
    ).toBe(true);
  });

  it("does not guess on short acknowledgements", () => {
    expect(isReplyLanguageMismatch("Tamam, başlayalım.", "tr")).toBe(false);
  });

  it("drops the medical line the composer already shows", () => {
    const text = stripMedicalDisclaimer(
      "Take the next photo in the same spot.\n\n*This is not medical advice — for any medical concern, please consult a professional.*",
    );
    expect(text).toBe("Take the next photo in the same spot.");
    expect(text).not.toMatch(/medical advice/i);
  });

  it("drops a written score list so the bar chart can stand alone", () => {
    const text = stripWrittenScoreDump(
      "Physique read — upper body session\n\nScores as observed:\n- Shoulders — 65\n- Chest — 60\n- Overall — 58\n\nKeep the same light.",
    );
    expect(text).toContain("Physique read");
    expect(text).toContain("Keep the same light.");
    expect(text).not.toMatch(/Shoulders — 65/);
    expect(text).not.toMatch(/Scores as observed/);
  });

  it("uses the shared mandatory directive in vision and council paths", () => {
    for (const file of [
      "lib/ai/personas.ts",
      "lib/kaios/council/turns.ts",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).toContain("buildReplyLanguageDirective");
      expect(source).not.toContain("append a SHORT disclaimer");
    }
  });
});
