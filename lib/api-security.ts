import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDisposableRisk } from "./disposable-domains";
import { logger } from "@/lib/logger";

// ──────────────────────────────────────────────
// 1. Zod Schemas — Tüm API route'ları için
// ──────────────────────────────────────────────

export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(254, "Email too long")
    .email("Invalid email format"),
  firstName: z
    .string()
    .trim()
    .max(100, "First name too long")
    .optional()
    .default("Unknown"),
  lastName: z
    .string()
    .trim()
    .max(100, "Last name too long")
    .optional(),
  recaptchaToken: z.string().min(1, "reCAPTCHA token is required"),
  honeypot: z.string().max(0, "Bot detected").optional(),
});

export const subscribeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(254, "Email too long")
    .email("Invalid email format"),
  firstName: z
    .string()
    .trim()
    .max(100, "First name too long")
    .optional()
    .default("Unknown"),
  lastName: z
    .string()
    .trim()
    .max(100, "Last name too long")
    .optional(),
  recaptchaToken: z.string().min(1, "reCAPTCHA token is required"),
  honeypot: z.string().max(0, "Bot detected").optional(),
});

export const leaderboardQuerySchema = z.object({
  userId: z.string().max(50).optional(),
});

// ──────────────────────────────────────────────
// 2. reCAPTCHA — Zorunlu doğrulama
// ──────────────────────────────────────────────

export async function validateRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secretKey || secretKey.includes("your_") || secretKey.includes("_here")) {
    if (isProduction) {
      logger.error("[security] RECAPTCHA_SECRET_KEY is missing in production");
      return false;
    }
    logger.warn("[security] RECAPTCHA_SECRET_KEY is not configured — skipping validation");
    return true;
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    logger.error("[security] reCAPTCHA validation error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

// ──────────────────────────────────────────────
// 3. Email Hash Logging (KVKK/GDPR uyumlu)
//    Web Crypto API kullanır (Edge Runtime uyumlu)
// ──────────────────────────────────────────────

export async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ──────────────────────────────────────────────
// 4. Disposable Email Check (Risk-tabanlı)
// ──────────────────────────────────────────────

export function checkDisposableEmail(email: string): {
  isDisposable: boolean;
  risk: "high" | "medium" | "none";
} {
  const domain = email.split("@")[1]?.toLowerCase().trim() || "";
  const risk = getDisposableRisk(domain);
  return {
    isDisposable: risk !== "none",
    risk,
  };
}

// ──────────────────────────────────────────────
// 5. Client IP Extraction (Cloudflare-aware)
// ──────────────────────────────────────────────

export function getClientIP(request: NextRequest): string {
  if (request.headers.get("cf-ray")) {
    return request.headers.get("cf-connecting-ip") || "unknown";
  }

  // Vercel sets x-real-ip at the edge; do not trust client-supplied x-forwarded-for.
  if (process.env.VERCEL) {
    return request.headers.get("x-real-ip") || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// ──────────────────────────────────────────────
// 6. Body Size Limit (10KB)
// ──────────────────────────────────────────────

export const MAX_BODY_SIZE = 10 * 1024; // 10KB

export async function parseBodyWithLimit(
  request: NextRequest
): Promise<unknown | null> {
  const text = await request.text();
  if (text.length > MAX_BODY_SIZE) {
    logger.warn("[security] Body too large", {
      bytes: text.length,
      max: MAX_BODY_SIZE,
    });
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// 7. Origin/Referer Validation (Whitelist)
// ──────────────────────────────────────────────

export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // ALLOWED_ORIGINS env'den veya varsayılan whitelist
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    "https://kaify.org,https://www.kaify.org,https://kaifyai.org,https://www.kaifyai.org"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // Origin kontrolü (regex yok, includes ile tam eşleşme)
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  // Referer fallback
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refererOrigin)) {
        return true;
      }
    } catch {
      // Invalid URL
    }
  }

  // Development ortamında localhost'a izin ver
  if (
    process.env.NODE_ENV === "development" &&
    (origin?.includes("localhost") || referer?.includes("localhost"))
  ) {
    return true;
  }

  return false;
}

// ──────────────────────────────────────────────
// 8. Bot Detection (User-Agent Heuristics)
// ──────────────────────────────────────────────

const BOT_USER_AGENTS = [
  "curl", "wget", "python-requests", "python-urllib", "go-http-client",
  "java/", "libwww-perl", "scrapy", "httpclient", "okhttp",
  "ruby", "php", "perl", "nikto", "nmap", "sqlmap",
  "zgrab", "masscan", "burpsuite", "postmanruntime",
];

export function isLikelyBot(request: NextRequest): boolean {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();

  // Boş User-Agent → şüpheli
  if (!ua || ua.length < 10) return true;

  // Bilinen bot imzaları
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot));
}

// ──────────────────────────────────────────────
// 9. Method Check
// ──────────────────────────────────────────────

export function allowMethods(
  request: NextRequest,
  methods: string[]
): NextResponse | null {
  if (!methods.includes(request.method)) {
    return new NextResponse(null, {
      status: 405,
      headers: { Allow: methods.join(", ") },
    });
  }
  return null;
}

// ──────────────────────────────────────────────
// 10. Standard API Error Response
// ──────────────────────────────────────────────

export function apiError(
  message: string,
  status: number = 400
): NextResponse {
  // İç detayları sızdırma — generic hata mesajı
  const publicMessage =
    status >= 500
      ? "An unexpected error occurred. Please try again later."
      : message;

  return NextResponse.json({ error: publicMessage }, { status });
}

// ──────────────────────────────────────────────
// 11. CSP Nonce Generator (Web Crypto API)
// ──────────────────────────────────────────────

export async function generateNonce(): Promise<string> {
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);
  return btoa(String.fromCharCode(...buffer));
}
