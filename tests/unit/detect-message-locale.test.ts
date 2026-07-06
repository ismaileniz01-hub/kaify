import { describe, expect, it } from "vitest";
import { detectMessageLocale } from "@/lib/i18n/detect-message-locale";
import { buildReplyLanguageDirective } from "@/lib/i18n/reply-language-directive";

describe("detectMessageLocale", () => {
  it("detects German on short German messages even when profile locale is Turkish", () => {
    expect(detectMessageLocale("was ist das", "tr")).toBe("de");
  });

  it("detects Turkish from common words when franc mislabels", () => {
    expect(detectMessageLocale("bugun ne yedin", "en")).toBe("tr");
  });

  it("detects English from common words when franc mislabels", () => {
    expect(detectMessageLocale("hello how are you today", "tr")).toBe("en");
  });

  it("falls back to profile locale for emoji-only messages", () => {
    expect(detectMessageLocale("😊💪", "tr")).toBe("tr");
  });

  it("detects Japanese from script", () => {
    expect(detectMessageLocale("今日は何を食べましたか", "en")).toBe("ja");
  });
});

describe("buildReplyLanguageDirective", () => {
  it("names the reply language explicitly", () => {
    const directive = buildReplyLanguageDirective("de");
    expect(directive).toContain("German");
    expect(directive).toContain("(de)");
    expect(directive).toContain("mandatory");
  });
});
