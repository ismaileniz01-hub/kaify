import { describe, expect, it } from "vitest";
import { detectMessageLocale } from "@/lib/i18n/detect-message-locale";
import { buildReplyLanguageDirective } from "@/lib/i18n/reply-language-directive";

describe("detectMessageLocale", () => {
  it("detects German on short German messages even when profile locale is Turkish", () => {
    expect(detectMessageLocale("was ist das", "tr")).toBe("de");
  });

  it("detects ASCII Turkish food logs that franc-min tags as Croatian", () => {
    expect(detectMessageLocale("Bi kase sutlac yedim", "en")).toBe("tr");
    expect(detectMessageLocale("bi kase sutlac yedim", "hr")).toBe("tr");
  });

  it("detects English from common words when franc mislabels", () => {
    expect(detectMessageLocale("hello how are you today", "tr")).toBe("en");
  });

  it("detects English slang bro/broo even when profile locale is Spanish", () => {
    expect(detectMessageLocale("broo...", "es")).toBe("en");
    expect(detectMessageLocale("bro", "es-mx")).toBe("en");
  });

  it("inherits thread language for ambiguous short replies", () => {
    const history = ["hello how are you today", "yeah I'm tired"];
    expect(detectMessageLocale("ok", "es", history)).toBe("en");
  });

  it("detects casual English short replies (ohh cute) even when profile is French", () => {
    expect(detectMessageLocale("ohh cute", "fr")).toBe("en");
    expect(detectMessageLocale("aww cute", "fr")).toBe("en");
  });

  it("inherits coach thread language for ambiguous replies after English coach message", () => {
    const coachEnglish =
      "I don't cuss at you, man — I push you. Get off that couch and into the gym.";
    expect(detectMessageLocale("ohh cute", "fr", [], [coachEnglish])).toBe("en");
  });

  it("falls back to profile locale for emoji-only messages", () => {
    expect(detectMessageLocale("😊💪", "tr")).toBe("tr");
  });

  it("detects Japanese from script", () => {
    expect(detectMessageLocale("今日は何を食べましたか", "en")).toBe("ja");
  });

  it("keeps Turkish when the user pastes a TR food-macro list", () => {
    expect(
      detectMessageLocale(
        "Tavuk tava (1 porsiyon): ~350-400 kcal, 30-35g protein - Çiğköfte (1 porsiyon): ~250-300 kcal",
        "en",
        ["bugun tavuk tava cigkofte sufle ve 2 simit yedim"],
      ),
    ).toBe("tr");
  });

  it("keeps Turkish when gym English words appear in a TR sentence", () => {
    expect(detectMessageLocale("bugun gym workout yaptim", "en")).toBe("tr");
  });
});

describe("resolveActiveLocale conversation stickiness", () => {
  it("keeps TR conversation on short ack even when app UI is English", async () => {
    const { resolveActiveLocale } = await import(
      "@/lib/kaios/localization/resolve"
    );
    expect(
      resolveActiveLocale({
        message: "sagol",
        messageLocale: "en",
        conversationLocale: "tr",
        savedLocale: "en",
        fallbackLocale: "en",
      }),
    ).toBe("tr");
  });
});

describe("foldDiacritics", () => {
  it("folds Turkish special letters", async () => {
    const { foldDiacritics } = await import("@/lib/i18n/fold-diacritics");
    expect(foldDiacritics("Türkçe nasıl")).toBe("turkce nasil");
    expect(foldDiacritics("sağol")).toBe("sagol");
  });
});

describe("buildReplyLanguageDirective", () => {
  it("names the reply language explicitly", () => {
    const directive = buildReplyLanguageDirective("de");
    expect(directive).toContain("German");
    expect(directive).toContain("(de)");
    expect(directive).toContain("mandatory");
    expect(directive).toContain("USER_CONTEXT");
    expect(directive).toMatch(/omit accents|special letters/i);
  });
});
