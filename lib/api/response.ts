import { NextResponse } from "next/server";
import { ApiError, type ApiErrorCode } from "@/lib/api/errors";

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
  const body: ApiFailure = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
  };
  return NextResponse.json(body, { status: error.status });
}

/**
 * Converts any thrown value into a standardized failure response.
 * Known ApiErrors are passed through; unknown errors are masked as 500
 * to avoid leaking internal details to the client.
 */
export function handleApiError(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ApiError) {
    return fail(error);
  }

  console.error(
    "[api] Unhandled error:",
    error instanceof Error ? error.message : "unknown error",
  );

  return fail(
    new ApiError("INTERNAL_ERROR", "Beklenmeyen bir sunucu hatası oluştu."),
  );
}
