import { NextResponse, NextRequest } from "next/server";
import { getClientIP, isLikelyBot, isAllowedOrigin } from "@/lib/api-security";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildContentSecurityPolicy, generateCspNonce } from "@/lib/security/csp";
import { logger } from "@/lib/logger";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
const RATE_LIMIT_CONFIG = {
  api: { requests: 60, windowMs: 60 * 1000 },
  page: { requests: 120, windowMs: 60 * 1000 },
  health: { requests: 10, windowMs: 60 * 1000 },
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
  "/.well-known/security.txt",
];

function getRateLimitBucket(pathname: string) {
  return pathname.startsWith("/api/") ? "api" : "page";
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

  if (pathname.startsWith("/api/") && isLikelyBot(request)) {
    logger.warn("middleware blocked bot request", { requestId, pathname, ip });
    return new NextResponse(
      JSON.stringify({ error: "Access denied" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (
    pathname.startsWith("/api/") &&
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
    const healthLimit = await checkRateLimit(
      `health:${ip}`,
      RATE_LIMIT_CONFIG.health,
    );
    if (!healthLimit.allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(healthLimit.resetMs / 1000)),
          },
        },
      );
    }
    const { response } = await updateSupabaseSession(forwardedRequest);
    response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
    response.headers.set("X-Request-ID", requestId);
    return response;
  }

  if (pathname.startsWith("/api/cron/")) {
    const { response } = await updateSupabaseSession(forwardedRequest);
    response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
    response.headers.set("X-Request-ID", requestId);
    return response;
  }
  const bucket = getRateLimitBucket(pathname);
  const config = RATE_LIMIT_CONFIG[bucket];
  const rateLimit = await checkRateLimit(`${bucket}:${ip}`, config);

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

  const { response } = await updateSupabaseSession(forwardedRequest);

  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  response.headers.set("X-Request-ID", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
  response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
