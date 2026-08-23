/**
 * Server-side hints that a request came from the Capacitor WebView.
 * Used to skip Google reCAPTCHA (broken in Android WebView) and to
 * allow the shell origin `https://localhost`.
 */
export const NATIVE_SHELL_ORIGINS = [
  "https://localhost",
  "http://localhost",
  "http://10.0.2.2:3000",
  "capacitor://localhost",
  "ionic://localhost",
] as const;

export function isNativeShellOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (NATIVE_SHELL_ORIGINS as readonly string[]).includes(origin);
}

export function isNativeWebViewRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (isNativeShellOrigin(origin)) return true;

  const ua = (request.headers.get("user-agent") ?? "").toLowerCase();
  if (ua.includes("capacitor")) return true;
  // Android System WebView (Capacitor / in-app browsers).
  return ua.includes("; wv)") && ua.includes("android");
}
