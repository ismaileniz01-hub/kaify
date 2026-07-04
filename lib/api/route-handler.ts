import { type NextRequest } from "next/server";
import { assertAiAvailable } from "@/lib/api/ai-guard";
import { requireAdmin } from "@/lib/api/admin-guard";
import { requireUser, type AuthedUser } from "@/lib/api/auth-guard";
import { handleApiError, ok } from "@/lib/api/response";
import { enforceUserRateLimit, type AiRateAction } from "@/lib/api/rate-guard";
import { assertUserDailyAiBudget } from "@/lib/ai/daily-cost-cap";
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
  requireAi?: boolean;
  dailyAiBudget?: boolean;
};

/**
 * Standard API route wrapper: auth → rate limit → AI guards → handler → envelope.
 * Keeps route files thin and consistent.
 */
export function defineRoute<T>(
  options: DefineRouteOptions,
  handler: (ctx: RouteContext) => Promise<T>,
) {
  const authMode = options.auth ?? "user";

  return async (request: NextRequest, ..._args: unknown[]) => {
    return withSpan(options.route, async () => {
      try {
        let user: AuthedUser;
        if (authMode === "admin") {
          user = await requireAdmin();
        } else if (authMode === "none") {
          user = { id: "", email: undefined };
        } else {
          user = await requireUser();
        }

        if (authMode !== "none" && options.rateLimit) {
          await enforceUserRateLimit(user.id, options.rateLimit);
        }
        if (options.requireAi) {
          await assertAiAvailable();
        }
        if (authMode !== "none" && options.dailyAiBudget) {
          await assertUserDailyAiBudget(user.id);
        }

        const result = await handler({ user, request });
        return ok(result);
      } catch (error) {
        return handleApiError(error, { route: options.route });
      }
    });
  };
}
