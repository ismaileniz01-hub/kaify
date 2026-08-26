import { describe, expect, it } from "vitest";
import { nativeScreenFromUrl } from "@/lib/native/deep-links";

describe("native deep-link screen mapping", () => {
  it.each([
    ["https://kaifyai.org/login", "login"],
    ["https://kaifyai.org/signup?ref=abc", "signup"],
    ["https://kaifyai.org/welcome", "welcome"],
    ["https://kaifyai.org/chat/kai", "chat"],
    ["https://kaifyai.org/pricing", "plan"],
    ["kaify://signup", "signup"],
    ["https://example.com/phishing", "login"],
  ] as const)("maps %s to %s without keeping query text", (url, screen) => {
    expect(nativeScreenFromUrl(url)).toBe(screen);
  });
});
