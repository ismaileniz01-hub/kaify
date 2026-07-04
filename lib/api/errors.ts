/**
 * Standardized API error model.
 * Every route converts failures into an ApiError, which maps to a stable
 * HTTP status code and a machine-readable error code for the frontend.
 */

export const API_ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = API_ERROR_STATUS[code];
    this.details = details;
  }
}
