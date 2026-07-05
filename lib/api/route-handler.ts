import { type NextRequest } from "next/server";
import { assertAiAvailable } from "@/lib/api/ai-guard";
import { requireAdmin } from "@/lib/api/admin-guard";
import { requireUser, type AuthedUser } from "@/lib/api/auth-guard";
import { verifyCronSecret } from "@/lib/api/cron-auth";
import { handleApiError, ok } from "@/lib/api/response";
import {
  enforcePublicRateLimit,
  enforceUserRateLimit,
  type AiRateAction,
} from "@/lib/api/rate-guard";
import { requireSensitiveActionAuth } from "@/lib/auth/mfa-server";
import { assertUserDailyAiBudget } from "@/lib/ai/daily-cost-cap";
import { assertCsrf } from "@/lib/security/csrf";
import { getClientIP } from "@/lib/api-security";
import { assertConsent } from "@/lib/services/consent.service";
import { CONSENT_TYPES } from "@/lib/legal/constants";
import { withSpan } from "@/lib/observability/tracing";

export type RouteAuth = "user" | "admin" | "none";

export type RouteContext = {
  user: AuthedUser;
  request: NextRequest;
};

export type DefineRouteOptions = {
  route: string;
  auth?: RouteAuth;
  rateLimit?: AiRateAction;
  /** IP-scoped limit for auth:none routes (waitlist, subscribe, health). */
  publicRateLimit?: Extract<
    AiRateAction,
    "waitlist" | "subscribe" | "health_probe"
  >;
  requireAi?: boolean;
  dailyAiBudget?: boolean;
  /** MFA step-up for delete/export and similar destructive actions. */
  sensitiveAction?: boolean;
  /** Double-submit CSRF token (delete, export, purchase). */
  requireCsrf?: boolean;
  /** Terms + Privacy clickwrap recorded in consent_records. */
  requireTermsConsent?: boolean;
  /** GDPR Art. 9 AI / health processing consent. */
  requireAiConsent?: boolean;
  /** Explicit consent before body/food photo analysis. */
  requirePhotoConsent?: boolean;
};

async function runRouteGuards(
  options: DefineRouteOptions,
  authMode: RouteAuth,
  user: AuthedUser,
  request: NextRequest,
): Promise<void> {
  if (authMode === "none" && options.publicRateLimit) {
    await enforcePublicRateLimit(getClientIP(request), options.publicRateLimit);
  }

  if (authMode !== "none" && options.rateLimit) {
    await enforceUserRateLimit(user.id, options.rateLimit);
  }

  if (authMode !== "none" && options.sensitiveAction) {
    await requireSensitiveActionAuth(user);
  }

  if (options.requireCsrf) {
    await assertCsrf(request);
  }

  if (authMode !== "none" && options.requireTermsConsent) {
    await assertConsent(user.id, CONSENT_TYPES.TERMS_PRIVACY);
  }

  if (authMode !== "none" && options.requireAiConsent) {
    await assertConsent(user.id, CONSENT_TYPES.AI_HEALTH);
  }

  if (authMode !== "none" && options.requirePhotoConsent) {
    await assertConsent(user.id, CONSENT_TYPES.PHOTO_ANALYSIS);
  }

  if (options.requireAi) {
    await assertAiAvailable();
  }

  if (authMode !== "none" && options.dailyAiBudget) {
    await assertUserDailyAiBudget(user.id);
  }
}

async function resolveRouteUser(authMode: RouteAuth): Promise<AuthedUser> {
  if (authMode === "admin") {
    return requireAdmin();
  }
  if (authMode === "none") {
    return { id: "", email: undefined };
  }
  return requireUser();
}

/**
 * Standard API route wrapper: auth → rate limit → AI guards → handler → envelope.
 */
export function defineRoute<T>(
  options: DefineRouteOptions,
  handler: (ctx: RouteContext) => Promise<T>,
) {
  const authMode = options.auth ?? "user";

  return async (request: NextRequest, ..._args: unknown[]) => {
    return withSpan(options.route, async () => {
      try {
        const user = await resolveRouteUser(authMode);
        await runRouteGuards(options, authMode, user, request);
        const result = await handler({ user, request });
        return ok(result);
      } catch (error) {
        return handleApiError(error, { route: options.route });
      }
    });
  };
}

/**
 * Like defineRoute but the handler returns a raw Response (SSE, file download, redirect).
 */
export function defineRouteRaw(
  options: DefineRouteOptions,
  handler: (ctx: RouteContext) => Promise<Response>,
) {
  const authMode = options.auth ?? "user";

  return async (request: NextRequest, ..._args: unknown[]) => {
    return withSpan(options.route, async () => {
      try {
        const user = await resolveRouteUser(authMode);
        await runRouteGuards(options, authMode, user, request);
        return await handler({ user, request });
      } catch (error) {
        return handleApiError(error, { route: options.route });
      }
    });
  };
}

export type DynamicRouteContext<TParams> = RouteContext & {
  params: TParams;
};

/**
 * Route wrapper for dynamic segments (`[coachId]`, etc.).
 */
export function defineDynamicRoute<TParams>(
  options: DefineRouteOptions,
  handler: (ctx: DynamicRouteContext<TParams>) => Promise<unknown>,
) {
  const authMode = options.auth ?? "user";

  return async (
    request: NextRequest,
    routeCtx: { params: Promise<TParams> },
  ) => {
    return withSpan(options.route, async () => {
      try {
        const user = await resolveRouteUser(authMode);
        await runRouteGuards(options, authMode, user, request);
        const params = await routeCtx.params;
        const result = await handler({ user, request, params });
        return ok(result);
      } catch (error) {
        return handleApiError(error, { route: options.route });
      }
    });
  };
}

export function defineDynamicRouteRaw<TParams>(
  options: DefineRouteOptions,
  handler: (ctx: DynamicRouteContext<TParams>) => Promise<Response>,
) {
  const authMode = options.auth ?? "user";

  return async (
    request: NextRequest,
    routeCtx: { params: Promise<TParams> },
  ) => {
    return withSpan(options.route, async () => {
      try {
        const user = await resolveRouteUser(authMode);
        await runRouteGuards(options, authMode, user, request);
        const params = await routeCtx.params;
        return await handler({ user, request, params });
      } catch (error) {
        return handleApiError(error, { route: options.route });
      }
    });
  };
}

export type CronRouteContext = {
  request: NextRequest;
};

/**
 * Cron route wrapper — verifies CRON_SECRET before running the handler.
 */
export function defineCronRoute<T>(
  route: string,
  handler: (ctx: CronRouteContext) => Promise<T>,
) {
  return async (request: NextRequest) => {
    return withSpan(route, async () => {
      if (!verifyCronSecret(request)) {
        return new Response("Unauthorized", { status: 401 });
      }
      try {
        const result = await handler({ request });
        return ok(result);
      } catch (error) {
        return handleApiError(error, { route });
      }
    });
  };
}

export function defineCronRouteRaw(
  route: string,
  handler: (ctx: CronRouteContext) => Promise<Response>,
) {
  return async (request: NextRequest) => {
    return withSpan(route, async () => {
      if (!verifyCronSecret(request)) {
        return new Response("Unauthorized", { status: 401 });
      }
      try {
        return await handler({ request });
      } catch (error) {
        return handleApiError(error, { route });
      }
    });
  };
}
