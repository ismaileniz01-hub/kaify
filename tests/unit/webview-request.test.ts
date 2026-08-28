import { describe, expect, it } from "vitest";
import {
  isNativeClientVersion,
  isNativeShellOrigin,
  isNativeWebViewRequest,
  NATIVE_CORS_ALLOW_HEADERS,
} from "@/lib/native/webview-request";

describe("webview-request", () => {
  it("recognizes Capacitor shell origins", () => {
    expect(isNativeShellOrigin("https://localhost")).toBe(true);
    expect(isNativeShellOrigin("capacitor://localhost")).toBe(true);
    expect(isNativeShellOrigin("capacitor://org.kaifyai.app")).toBe(true);
    expect(isNativeShellOrigin("ionic://localhost")).toBe(true);
    expect(isNativeShellOrigin("https://kaifyai.org")).toBe(false);
  });

  it("treats native-* client version as a WebView request", () => {
    expect(isNativeClientVersion("native-1.0.4")).toBe(true);
    const request = new Request("https://kaifyai.org/api/auth/otp/verify", {
      headers: { "x-client-version": "native-1.0.4" },
    });
    expect(isNativeWebViewRequest(request)).toBe(true);
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

  it("detects iOS Capacitor WKWebView user agents without Safari token", () => {
    const request = new Request("https://kaifyai.org/api/auth/otp/verify", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
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

  it("does not treat Mobile Safari as native", () => {
    const request = new Request("https://kaifyai.org/api/auth/otp/send", {
      headers: {
        origin: "https://kaifyai.org",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
    });
    expect(isNativeWebViewRequest(request)).toBe(false);
  });

  it("lists X-Client-Version in CORS allow headers", () => {
    expect(NATIVE_CORS_ALLOW_HEADERS).toMatch(/X-Client-Version/i);
  });
});
