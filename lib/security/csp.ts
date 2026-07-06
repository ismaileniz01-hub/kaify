/** Builds a per-request Content-Security-Policy with a cryptographic nonce. */
export function isLegalContentPath(pathname: string): boolean {
  return (
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/cookies" ||
    pathname.startsWith("/privacy/") ||
    pathname.startsWith("/terms/") ||
    pathname.startsWith("/cookies/")
  );
}

export function buildContentSecurityPolicy(
  nonce: string,
  options?: { legalEmbed?: boolean },
): string {
  const styleSrc = options?.legalEmbed
    ? "style-src 'self' 'unsafe-inline' https://app.termly.io"
    : "style-src 'self' 'unsafe-inline'";

  const scriptSrc = options?.legalEmbed
    ? [
        "script-src",
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://cdn.sender.net",
        "https://app.termly.io",
      ].join(" ")
    : [
        "script-src",
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        "https://www.google.com",
        "https://www.gstatic.com",
        "https://cdn.sender.net",
      ].join(" ");

  const directives = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: blob: https://*.supabase.co https://flagcdn.com",
    "font-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    [
      "connect-src",
      "'self'",
      "https://api.sender.net",
      "https://cdn.sender.net",
      "https://www.google.com",
      "https://*.google.com",
      "wss://*.google.com",
      "https://*.gstatic.com",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.ingest.sentry.io",
      "https://*.ingest.us.sentry.io",
      "https://*.ingest.de.sentry.io",
    ].join(" "),
    "frame-src https://www.google.com https://recaptcha.google.com https://app.termly.io",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
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
