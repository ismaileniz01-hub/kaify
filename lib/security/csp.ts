/** Builds a per-request Content-Security-Policy with a cryptographic nonce. */
export function buildContentSecurityPolicy(nonce: string): string {
  const directives = [
    "default-src 'self'",
    [
      "script-src",
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://www.google.com",
      "https://www.gstatic.com",
      "https://cdn.sender.net",
    ].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://flagcdn.com",
    "font-src 'self'",
    // Service worker (Web Push) — governed here, not by strict-dynamic script-src.
    "worker-src 'self'",
    "manifest-src 'self'",
    [
      "connect-src",
      "'self'",
      "https://api.sender.net",
      "https://cdn.sender.net",
      "https://www.google.com",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.ingest.sentry.io",
      "https://*.ingest.us.sentry.io",
      "https://*.ingest.de.sentry.io",
    ].join(" "),
    "frame-src https://www.google.com https://recaptcha.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Clickjacking defense at the CSP layer (complements X-Frame-Options: DENY).
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

export function generateCspNonce(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return btoa(String.fromCharCode(...buffer));
}
