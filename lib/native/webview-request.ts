/**
 * Server-side hints that a request came from the Capacitor WebView.
 * Used to skip Google reCAPTCHA (broken in Android WebView), return bearer
 * tokens from OTP verify, and allow the local shell origin through CORS.
 */
export const NATIVE_SHELL_ORIGINS = [
  "https://localhost",
  "http://localhost",
  "http://127.0.0.1",
  "http://10.0.2.2:3000",
  "capacitor://localhost",
  "ionic://localhost",
] as const;

/** Headers native fetch always sends — must appear in CORS Allow-Headers. */
export const NATIVE_CORS_ALLOW_HEADERS =
  "Authorization, Content-Type, Accept, Idempotency-Key, X-Client-Version, X-CSRF-Token, x-csrf-token";

export function isNativeClientVersion(version: string | null): boolean {
  return Boolean(version && /^native-/i.test(version.trim()));
}

export function isNativeShellOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if ((NATIVE_SHELL_ORIGINS as readonly string[]).includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol === "capacitor:" || url.protocol === "ionic:") return true;
    const localHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "10.0.2.2";
    return (
      localHost && (url.protocol === "https:" || url.protocol === "http:")
    );
  } catch {
    return false;
  }
}

function isIosWebViewUserAgent(ua: string): boolean {
  const appleMobile =
    ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod");
  if (!appleMobile || !ua.includes("applewebkit") || !ua.includes("mobile")) {
    return false;
  }
  if (ua.includes("capacitor")) return true;
  // Mobile Safari includes "safari/"; Capacitor WKWebView typically does not.
  return !ua.includes("safari/");
}

export function isNativeWebViewRequest(request: Request): boolean {
  if (isNativeClientVersion(request.headers.get("x-client-version"))) {
    return true;
  }
  const origin = request.headers.get("origin");
  if (isNativeShellOrigin(origin)) return true;

  const ua = (request.headers.get("user-agent") ?? "").toLowerCase();
  if (ua.includes("capacitor")) return true;
  if (ua.includes("; wv)") && ua.includes("android")) return true;
  return isIosWebViewUserAgent(ua);
}
