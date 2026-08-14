import { NextResponse, NextRequest } from "next/server";
import { getClientIP, isLikelyBot, isAllowedOrigin } from "@/lib/api-security";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildContentSecurityPolicy,
  buildCspReportingEndpoints,
  generateCspNonce,
  isLegalContentPath,
} from "@/lib/security/csp";
import { CSP_REPORT_PATH } from "@/lib/security/csp-report";
import { attachCsrfCookie } from "@/lib/security/csrf-crypto";
import { logger } from "@/lib/logger";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import {
  isLegacyPublicApi,
  legacyApiDeprecationHeaders,
} from "@/lib/api/v1-manifest";

const RATE_LIMIT_CONFIG = {
  api: { requests: 400, windowMs: 60 * 1000 },
  page: { requests: 300, windowMs: 60 * 1000 },
  health: { requests: 10, windowMs: 60 * 1000 },
  /** Anonymous marketing/legal — higher ceiling when rate limit still applied. */
  marketing: { requests: 600, windowMs: 60 * 1000 },
};

const SUSPICIOUS_PATHS = [
  "/wp-admin", "/wp-login", "/.env", "/config.php",
  "/phpinfo", "/.git", "/admin.php", "/shell.php",
  "/xmlrpc.php", "/wp-content", "/wp-includes",
  "/administrator", "/backup", "/db_backup",
  "/sql", "/mysql", "/phpmyadmin", "/pma",
  "/.aws", "/.ssh", "/.config", "/.npmrc",
  "/actuator", "/swagger", "/api-docs",
  "/vendor", "/node_modules", "/composer.json",
  "/server-status", "/server-info",
  "/cgi-bin", "/cpanel", "/webmail",
];

const MARKETING_EXACT = new Set([
  "/",
  "/privacy",
  "/terms",
  "/terms&conditions",
  "/cookies",
  "/kvkk",
]);

function isMarketingPath(pathname: string): boolean {
  if (MARKETING_EXACT.has(pathname)) return true;
  return (
    pathname.startsWith("/privacy/") ||
    pathname.startsWith("/terms/") ||
    pathname.startsWith("/cookies/") ||
    pathname.startsWith("/kvkk/")
  );
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("auth-token") ||
        (c.name.startsWith("sb-") && c.name.includes("auth")),
    );
}

function getRateLimitBucket(pathname: string): keyof typeof RATE_LIMIT_CONFIG {
  if (pathname.startsWith("/api/")) return "api";
  if (isMarketingPath(pathname)) return "marketing";
  return "page";
}

/**
 * Edge middleware covers every navigation + API call.
 * API + page traffic soft-open in production when Upstash flaps (memory fallback)
 * so a Redis outage does not 429 the whole product. Expensive AI handlers still
 * fail-closed via enforceUserRateLimit. Health probes skip rate limiting above.
 */
const RATE_LIMIT_SOFT =
  process.env.NODE_ENV === "production"
    ? ({ failClosedInProduction: false } as const)
    : undefined;

async function finalizeResponse(
  forwardedRequest: NextRequest,
  nonce: string,
  requestId: string,
  pathname: string,
  rateLimit?: { limit: number; remaining: number },
  options?: { skipSessionRefresh?: boolean },
) {
  const { response } = options?.skipSessionRefresh
    ? {
        response: NextResponse.next({
          request: { headers: forwardedRequest.headers },
        }),
      }
    : await updateSupabaseSession(forwardedRequest);

  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(nonce, { legalEmbed: isLegalContentPath(pathname) }),
  );
  response.headers.set("Reporting-Endpoints", buildCspReportingEndpoints());
  response.headers.set("X-Request-ID", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), browsing-topics=(), interest-cohort=()",
  );
  if (rateLimit) {
    response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  }

  if (pathname.startsWith("/api/v1/")) {
    response.headers.set("X-API-Version", "v1");
  } else if (isLegacyPublicApi(pathname)) {
    for (const [key, value] of Object.entries(legacyApiDeprecationHeaders())) {
      response.headers.set(key, value);
    }
  }

  return await attachCsrfCookie(forwardedRequest, response);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  const nonce = generateCspNonce();
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);
  const forwardedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });
  if (SUSPICIOUS_PATHS.some((p) => pathname.toLowerCase().includes(p))) {
    logger.warn("middleware blocked suspicious path", { requestId, pathname, ip });
    return new NextResponse(null, { status: 404 });
  }

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/webhooks/") &&
    !pathname.startsWith("/api/cron/") &&
    pathname !== "/api/health" &&
    pathname !== CSP_REPORT_PATH &&
    isLikelyBot(request)
  ) {
    logger.warn("middleware blocked bot request", { requestId, pathname, ip });
    return new NextResponse(
      JSON.stringify({ error: "Access denied" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/webhooks/") &&
    pathname !== CSP_REPORT_PATH &&
    ["POST", "PUT", "DELETE", "PATCH"].includes(request.method) &&
    !isAllowedOrigin(request)
  ) {
    logger.warn("middleware blocked cross-origin request", {
      requestId,
      method: request.method,
      pathname,
      ip,
    });
    return new NextResponse(
      JSON.stringify({ error: "Access denied" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (pathname === "/api/health") {
    return finalizeResponse(forwardedRequest, nonce, requestId, pathname);
  }

  if (pathname === CSP_REPORT_PATH) {
    return finalizeResponse(forwardedRequest, nonce, requestId, pathname, undefined, {
      skipSessionRefresh: true,
    });
  }

  if (pathname.startsWith("/api/cron/") || pathname.startsWith("/api/webhooks/")) {
    return finalizeResponse(forwardedRequest, nonce, requestId, pathname);
  }

  // Anonymous marketing/legal: skip Redis rate limit + skip getUser() when no auth cookies.
  if (isMarketingPath(pathname) && !hasSupabaseAuthCookie(request)) {
    return finalizeResponse(forwardedRequest, nonce, requestId, pathname, undefined, {
      skipSessionRefresh: true,
    });
  }

  const bucket = getRateLimitBucket(pathname);
  const config = RATE_LIMIT_CONFIG[bucket];
  const rateLimit = await checkRateLimit(
    `${bucket}:${ip}`,
    config,
    RATE_LIMIT_SOFT,
  );

  if (!rateLimit.allowed) {
    logger.warn("middleware rate limit exceeded", { requestId, bucket, ip });
    return new NextResponse(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rateLimit.resetMs / 1000)),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      },
    );
  }

  return finalizeResponse(
    forwardedRequest,
    nonce,
    requestId,
    pathname,
    { limit: rateLimit.limit, remaining: rateLimit.remaining },
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
