import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isReplyLanguageMismatch } from "@/lib/i18n/reply-language-guard";

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

  it("does not guess on short acknowledgements", () => {
    expect(isReplyLanguageMismatch("Tamam, başlayalım.", "tr")).toBe(false);
  });

  it("uses the shared mandatory directive in vision and council paths", () => {
    for (const file of [
      "lib/ai/personas.ts",
      "lib/kaios/council/turns.ts",
    ]) {
      expect(readFileSync(join(process.cwd(), file), "utf8")).toContain(
        "buildReplyLanguageDirective",
      );
    }
  });
});
