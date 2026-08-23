import { describe, expect, it } from "vitest";
import {
  isNativeShellOrigin,
  isNativeWebViewRequest,
} from "@/lib/native/webview-request";

describe("webview-request", () => {
  it("recognizes Capacitor shell origins", () => {
    expect(isNativeShellOrigin("https://localhost")).toBe(true);
    expect(isNativeShellOrigin("capacitor://localhost")).toBe(true);
    expect(isNativeShellOrigin("https://kaifyai.org")).toBe(false);
  });

  it("detects Android WebView user agents", () => {
    const request = new Request("https://kaifyai.org/api/auth/otp/send", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      },
    });
    expect(isNativeWebViewRequest(request)).toBe(true);
  });

  it("does not treat desktop Chrome as native", () => {
    const request = new Request("https://kaifyai.org/api/auth/otp/send", {
      headers: {
        origin: "https://kaifyai.org",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
    });
    expect(isNativeWebViewRequest(request)).toBe(false);
  });
});
