import { NextResponse } from "next/server";
import { ApiError, type ApiErrorCode } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/observability/capture";
import { recordApiError } from "@/lib/resilience/error-monitor";
import { enterDegradedMode } from "@/lib/resilience/degraded-mode";

export type ApiWarningTrigger = "LIMIT_80" | "LIMIT_100";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  warning_trigger?: ApiWarningTrigger;
};

export type ApiFailure = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ApiResponseBody<T> = ApiSuccess<T> | ApiFailure;

type OkInit = {
  status?: number;
  warningTrigger?: ApiWarningTrigger;
};

/** Standardized success envelope. */
export function ok<T>(data: T, init: OkInit = {}): NextResponse<ApiSuccess<T>> {
  const body: ApiSuccess<T> = { success: true, data };
  if (init.warningTrigger) {
    body.warning_trigger = init.warningTrigger;
  }
  return NextResponse.json(body, { status: init.status ?? 200 });
}

/** Standardized failure envelope built from an ApiError. */
export function fail(error: ApiError): NextResponse<ApiFailure> {
  const includeDetails =
    error.details !== undefined &&
    !(
      process.env.NODE_ENV === "production" && error.code === "VALIDATION_ERROR"
    );

  const body: ApiFailure = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(includeDetails ? { details: error.details } : {}),
    },
  };
  return NextResponse.json(body, { status: error.status });
}

/**
 * Converts any thrown value into a standardized failure response.
 * Known ApiErrors are passed through; unknown errors are masked as 500
 * to avoid leaking internal details to the client.
 *
 * Server-side faults (5xx ApiErrors and unexpected throws) are reported to
 * Sentry; expected client errors (4xx: validation, auth, rate limit …) are
 * intentionally NOT captured to keep the error stream signal-rich.
 */
/**
 * Feeds a server fault into the resilience error monitor and trips degraded
 * mode when a 5xx spike is detected. No-op when the route is unknown.
 */
function monitorServerFault(
  route: string | undefined,
  status: number,
  code: ApiErrorCode,
): void {
  if (!route) return;
  void recordApiError({ route, status, code }).then((spike) => {
    if (spike.spikeDetected) {
      void enterDegradedMode(
        `5xx spike on ${route} (${spike.global5xxCount} in window)`,
      );
    }
  });
}

export function handleApiError(
  error: unknown,
  context?: { route?: string },
): NextResponse<ApiFailure> {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      logger.error("api server error", {
        code: error.code,
        error: error.message,
        route: context?.route,
      });
      captureServerError(error, { code: error.code });
      monitorServerFault(context?.route, error.status, error.code);
    }
    return fail(error);
  }

  logger.error("unhandled api error", {
    error: error instanceof Error ? error.message : "unknown error",
    stack: error instanceof Error ? error.stack : undefined,
    route: context?.route,
  });
  captureServerError(error, { code: "INTERNAL_ERROR" });
  monitorServerFault(context?.route, 500, "INTERNAL_ERROR");

  return fail(
    new ApiError("INTERNAL_ERROR", "Beklenmeyen bir sunucu hatası oluştu."),
  );
}
