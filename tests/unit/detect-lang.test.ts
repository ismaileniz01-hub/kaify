import { describe, expect, it } from "vitest";
import {
  detectLangFromTags,
  isPlaceholderCopy,
  otpLocaleForLang,
} from "@/lib/i18n/detect-lang";

describe("detectLangFromTags", () => {
  it("maps exact and regional tags onto reviewed picker locales", () => {
    expect(detectLangFromTags(["tr-TR"])).toBe("tr");
    expect(detectLangFromTags(["de-DE"])).toBe("de");
    expect(detectLangFromTags(["es-MX"])).toBe("es-mx");
    expect(detectLangFromTags(["ar-SA"])).toBe("ar");
  });

  it("falls back to English for unsupported device languages", () => {
    expect(detectLangFromTags(["he-IL"])).toBe("en");
    expect(detectLangFromTags(["pt-BR"])).toBe("en");
    expect(detectLangFromTags([])).toBe("en");
  });

  it("prefers the first matching tag in the list", () => {
    expect(detectLangFromTags(["he", "tr-TR", "en"])).toBe("tr");
  });
});

describe("placeholder copy and OTP locale", () => {
  it("treats UNSUPPORTED_LANG as missing copy", () => {
    expect(isPlaceholderCopy("UNSUPPORTED_LANG")).toBe(true);
    expect(isPlaceholderCopy("")).toBe(true);
    expect(isPlaceholderCopy("  ")).toBe(true);
    expect(isPlaceholderCopy("Check your email")).toBe(false);
  });

  it("sends OTP email in Turkish only for Turkish UI", () => {
    expect(otpLocaleForLang("tr")).toBe("tr");
    expect(otpLocaleForLang("en")).toBe("en");
    expect(otpLocaleForLang("de")).toBe("en");
  });
});
