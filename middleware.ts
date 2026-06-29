import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIP, isLikelyBot, isAllowedOrigin } from "@/lib/api-security";

// ──────────────────────────────────────────────
// In-memory rate limiter (Vercel Edge Runtime)
// Production'da Upstash Redis ile değiştirilmeli
// ──────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
  "/api/": { requests: 20, windowMs: 60 * 1000 },   // 20 req/min for API
  "/": { requests: 100, windowMs: 60 * 1000 },       // 100 req/min for pages
};

function getRateLimit(pathname: string) {
  for (const [path, config] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (pathname.startsWith(path)) return config;
  }
  return RATE_LIMIT_CONFIG["/"];
}

// ──────────────────────────────────────────────
// Suspicious path patterns (bots/scanners)
// ──────────────────────────────────────────────
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  const now = Date.now();

  // ── 1. Block suspicious paths ──
  if (SUSPICIOUS_PATHS.some((p) => pathname.toLowerCase().includes(p))) {
    console.warn(`[middleware] Blocked suspicious path: ${pathname} from IP: ${ip}`);
    return new NextResponse(null, { status: 404 });
  }

  // ── 2. Bot detection (API routes only) ──
  // TEMPORARILY DISABLED for testing
  // if (pathname.startsWith("/api/") && isLikelyBot(request)) {
  //   console.warn(`[middleware] Blocked bot request to ${pathname} from IP: ${ip}`);
  //   return new NextResponse(
  //     JSON.stringify({ error: "Access denied" }),
  //     {
  //       status: 403,
  //       headers: { "Content-Type": "application/json" },
  //     }
  //   );
  // }

  // ── 3. Origin validation (POST/PUT/DELETE API routes) ──
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PUT", "DELETE"].includes(request.method) &&
    !isAllowedOrigin(request)
  ) {
    console.warn(
      `[middleware] Blocked cross-origin request: ${request.method} ${pathname} from IP: ${ip}`
    );
    return new NextResponse(
      JSON.stringify({ error: "Access denied" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // ── 4. Rate limiting ──
  const key = `${ip}:${pathname}`;
  const config = getRateLimit(pathname);
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
  } else {
    record.count++;
    if (record.count > config.requests) {
      console.warn(
        `[middleware] Rate limit exceeded for ${pathname} from IP: ${ip}`
      );
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            "X-RateLimit-Limit": String(config.requests),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // ── 5. Add security headers ──
  const response = NextResponse.next();
  response.headers.set("X-Request-ID", crypto.randomUUID());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
