import { CSP_REPORT_GROUP, CSP_REPORT_PATH } from "@/lib/security/csp-report";
import { NATIVE_ENTRY_BOOT_CSP_HASH } from "@/lib/native/native-entry-boot";

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
  // Wildcard matters on nonce-less (static) pages, where 'strict-dynamic' does
  // not cover scripts Paddle injects from its other subdomains.
  // Paddle.js also injects Paddle Retain (ProfitWell) from public.profitwell.com.
  script: [
    "https://cdn.paddle.com",
    "https://sandbox-cdn.paddle.com",
    "https://*.paddle.com",
    "https://public.profitwell.com",
  ],
  style: ["https://cdn.paddle.com", "https://sandbox-cdn.paddle.com"],
  connect: [
    "https://*.profitwell.com",
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

/**
 * @param nonce Per-request nonce for dynamic (authenticated product) pages.
 *   Pass `null` for statically prerendered marketing/legal pages: their HTML is
 *   built once and served from cache, so it cannot carry a per-request nonce.
 *   Those pages render no user-controlled content, so inline scripts are allowed
 *   there instead of re-rendering every page on every request.
 */
export function buildContentSecurityPolicy(
  nonce: string | null,
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
    // Static pages: no nonce and no hash — browsers ignore 'unsafe-inline'
    // whenever a nonce or hash source is present in the same directive.
    ...(nonce
      ? [`'nonce-${nonce}'`, `'${NATIVE_ENTRY_BOOT_CSP_HASH}'`, "'strict-dynamic'"]
      : ["'unsafe-inline'"]),
    "https://www.google.com",
    "https://www.gstatic.com",
    "https://cdn.sender.net",
    "https://*.sender.net",
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
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_GROUP}`,
  ];
  return directives.join("; ");
}

/** Reporting-Endpoints (modern) — pair with report-uri for Safari/Firefox. */
export function buildCspReportingEndpoints(): string {
  return `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;
}

export function generateCspNonce(): string {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return btoa(String.fromCharCode(...buffer));
}
