import { describe, expect, it } from "vitest";
import { ApiError, API_ERROR_STATUS } from "@/lib/api/errors";

describe("ApiError", () => {
  it("maps each code to its stable HTTP status", () => {
    expect(new ApiError("VALIDATION_ERROR", "x").status).toBe(400);
    expect(new ApiError("UNAUTHORIZED", "x").status).toBe(401);
    expect(new ApiError("FORBIDDEN", "x").status).toBe(403);
    expect(new ApiError("NOT_FOUND", "x").status).toBe(404);
    expect(new ApiError("CONFLICT", "x").status).toBe(409);
    expect(new ApiError("RATE_LIMITED", "x").status).toBe(429);
    expect(new ApiError("INTERNAL_ERROR", "x").status).toBe(500);
  });

  it("matches the exported status table for every code", () => {
    for (const [code, status] of Object.entries(API_ERROR_STATUS)) {
      expect(new ApiError(code as keyof typeof API_ERROR_STATUS, "m").status).toBe(status);
    }
  });

  it("is an Error with name, message and optional details", () => {
    const err = new ApiError("CONFLICT", "dup", { field: "email" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.message).toBe("dup");
    expect(err.details).toEqual({ field: "email" });
  });
});
