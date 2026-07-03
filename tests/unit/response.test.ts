import { afterEach, describe, expect, it, vi } from "vitest";
import { ok, fail, handleApiError } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";

// Sentry capture is a no-op when unconfigured, but mock it to keep tests hermetic.
vi.mock("@/lib/observability/capture", () => ({
  captureServerError: vi.fn(),
}));

async function readJson(res: Response) {
  return (await res.json()) as Record<string, unknown>;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("ok()", () => {
  it("wraps data in the success envelope with status 200", async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await readJson(res)).toEqual({ success: true, data: { a: 1 } });
  });

  it("honors custom status and warning trigger", async () => {
    const res = ok({ a: 1 }, { status: 201, warningTrigger: "LIMIT_80" });
    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body.warning_trigger).toBe("LIMIT_80");
  });
});

describe("fail()", () => {
  it("returns the ApiError code, message and status", async () => {
    const res = fail(new ApiError("NOT_FOUND", "nope"));
    expect(res.status).toBe(404);
    const body = await readJson(res);
    expect(body).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND", message: "nope" },
    });
  });

  it("includes details for non-validation errors", async () => {
    const res = fail(new ApiError("CONFLICT", "dup", { field: "x" }));
    const body = (await readJson(res)) as { error: { details?: unknown } };
    expect(body.error.details).toEqual({ field: "x" });
  });

  it("redacts validation details in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = fail(new ApiError("VALIDATION_ERROR", "bad", { issues: ["secret"] }));
    const body = (await readJson(res)) as { error: { details?: unknown } };
    expect(body.error.details).toBeUndefined();
  });
});

describe("handleApiError()", () => {
  it("passes ApiErrors through untouched", async () => {
    const res = handleApiError(new ApiError("FORBIDDEN", "no"));
    expect(res.status).toBe(403);
    const body = await readJson(res);
    expect((body.error as { code: string }).code).toBe("FORBIDDEN");
  });

  it("masks unknown errors as a generic 500", async () => {
    const res = handleApiError(new Error("db exploded with secret dsn"));
    expect(res.status).toBe(500);
    const body = (await readJson(res)) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("secret");
  });
});
