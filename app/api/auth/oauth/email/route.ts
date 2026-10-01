import { z } from "zod";
import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().min(8).max(2048),
  codeVerifier: z.string().min(20).max(256),
});

/**
 * Exchange a native PKCE code for the provider email, then drop that session.
 * The installed app still proves the inbox with the email code.
 */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/oauth/email",
    auth: "none",
    publicRateLimit: "otp_verify",
    requireCsrf: false,
  },
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return fail(new ApiError("VALIDATION_ERROR", "Invalid sign-in code.", parsed.error.issues));
    }

    let url: string;
    let anonKey: string;
    try {
      const env = getSupabasePublicEnv();
      url = env.url.replace(/\/$/, "");
      anonKey = env.anonKey;
    } catch {
      return fail(new ApiError("SERVICE_UNAVAILABLE", "Sign-in is unavailable."));
    }

    let email = "";
    let accessToken = "";
    try {
      const tokenResponse = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_code: parsed.data.code,
          code_verifier: parsed.data.codeVerifier,
        }),
      });
      const payload = (await tokenResponse.json().catch(() => null)) as {
        access_token?: string;
        user?: { email?: string };
      } | null;
      email = payload?.user?.email?.trim().toLowerCase() ?? "";
      accessToken = payload?.access_token ?? "";
      if (!tokenResponse.ok || !email.includes("@")) {
        logger.warn("oauth email exchange failed", { status: tokenResponse.status });
        return fail(new ApiError("UNAUTHORIZED", "That sign-in did not return an email."));
      }
    } catch (error) {
      logger.warn("oauth email exchange unreachable", {
        message: error instanceof Error ? error.message : "unknown",
      });
      return fail(new ApiError("SERVICE_UNAVAILABLE", "Sign-in is unavailable."));
    }

    if (accessToken) {
      await fetch(`${url}/auth/v1/logout?scope=global`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }).catch(() => undefined);
    }

    return ok({ email });
  },
);
