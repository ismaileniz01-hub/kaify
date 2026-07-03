import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const callbackQuerySchema = z.object({
  code: z.string().min(1).max(1024).optional(),
  next: z.string().max(512).optional(),
});

/**
 * Sanitizes the post-login redirect target to prevent open-redirect attacks.
 * Only same-origin absolute paths ("/...") are allowed.
 */
function sanitizeNext(next: string | undefined): string {
  const fallback = "/welcome";
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/**
 * OAuth / magic-link callback handler.
 * Exchanges the auth code for a session, then redirects to a safe path.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const redirectTo = (path: string): NextResponse => {
    const url = new URL(path, request.nextUrl.origin);
    return NextResponse.redirect(url);
  };

  const parsed = callbackQuerySchema.safeParse({
    code: request.nextUrl.searchParams.get("code") ?? undefined,
    next: request.nextUrl.searchParams.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return redirectTo("/login?error=invalid_callback");
  }

  const { code } = parsed.data;
  const safeNext = sanitizeNext(parsed.data.next);

  if (!code) {
    return redirectTo("/login?error=missing_code");
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error("[api/auth/callback] exchange failed", { error: error.message });
      return redirectTo("/login?error=auth_callback_failed");
    }

    return redirectTo(safeNext);
  } catch (error) {
    logger.error("[api/auth/callback] unexpected error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return redirectTo("/login?error=auth_callback_failed");
  }
}
