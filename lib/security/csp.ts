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

/** Paddle Billing (checkout overlay + Paddle.js CDN assets). */
const PADDLE_CSP = {
  script: ["https://cdn.paddle.com", "https://sandbox-cdn.paddle.com"],
  style: ["https://cdn.paddle.com", "https://sandbox-cdn.paddle.com"],
  connect: [
    "https://cdn.paddle.com",
    "https://sandbox-cdn.paddle.com",
    "https://api.paddle.com",
    "https://sandbox-api.paddle.com",
    "https://buy.paddle.com",
    "https://sandbox-buy.paddle.com",
    "https://*.paddle.com",
  ],
  frame: [
    "https://buy.paddle.com",
    "https://sandbox-buy.paddle.com",
    "https://*.paddle.com",
  ],
} as const;

export function buildContentSecurityPolicy(
  nonce: string,
  options?: { legalEmbed?: boolean },
): string {
  const styleSrc = options?.legalEmbed
    ? ["style-src", "'self'", "'unsafe-inline'", "https://app.termly.io", ...PADDLE_CSP.style].join(
        " ",
      )
    : ["style-src", "'self'", "'unsafe-inline'", ...PADDLE_CSP.style].join(" ");

  const scriptBase = [
    "script-src",
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://www.google.com",
    "https://www.gstatic.com",
    "https://cdn.sender.net",
    ...PADDLE_CSP.script,
  ];
  const scriptSrc = options?.legalEmbed
    ? [...scriptBase, "https://app.termly.io"].join(" ")
    : scriptBase.join(" ");

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
      ...PADDLE_CSP.connect,
    ].join(" "),
    [
      "frame-src",
      "https://www.google.com",
      "https://recaptcha.google.com",
      "https://app.termly.io",
      ...PADDLE_CSP.frame,
    ].join(" "),
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
