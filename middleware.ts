import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limiter (Vercel Edge Runtime compatible)
// For production with high traffic, replace with Upstash Redis
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
  "/api/": { requests: 20, windowMs: 60 * 1000 }, // 20 req/min for API routes
  "/": { requests: 100, windowMs: 60 * 1000 },    // 100 req/min for pages
};

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||       // Cloudflare
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown"
  );
}

function getRateLimit(pathname: string) {
  for (const [path, config] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (pathname.startsWith(path)) return config;
  }
  return RATE_LIMIT_CONFIG["/"];
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const config = getRateLimit(pathname);

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
  } else {
    record.count++;
    if (record.count > config.requests) {
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

  // Security: Block suspicious paths
  const suspiciousPaths = [
    "/wp-admin", "/wp-login", "/.env", "/config.php",
    "/phpinfo", "/.git", "/admin.php", "/shell.php",
  ];
  
  if (suspiciousPaths.some((p) => pathname.toLowerCase().includes(p))) {
    return new NextResponse(null, { status: 404 });
  }

  const response = NextResponse.next();

  // Add security headers to response
  response.headers.set("X-Request-ID", crypto.randomUUID());
  
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
