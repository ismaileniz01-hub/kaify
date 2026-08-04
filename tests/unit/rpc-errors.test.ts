import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { mapRpcError } from "@/lib/supabase/rpc-errors";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe("mapRpcError", () => {
  it("maps P0001 insufficient to FORBIDDEN", () => {
    expect(() =>
      mapRpcError(
        { code: "P0001", message: "Insufficient gem balance" },
        "[test]",
      ),
    ).toThrow(ApiError);
    try {
      mapRpcError(
        { code: "P0001", message: "Insufficient gem balance" },
        "[test]",
      );
    } catch (e) {
      expect(e).toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("maps P0001 duplicate to CONFLICT", () => {
    try {
      mapRpcError({ code: "P0001", message: "Already claimed" }, "[test]");
    } catch (e) {
      expect(e).toMatchObject({ code: "CONFLICT" });
    }
  });

  it("maps unknown codes to INTERNAL_ERROR", () => {
    try {
      mapRpcError({ code: "XX000", message: "boom" }, "[test]", "fallback");
    } catch (e) {
      expect(e).toMatchObject({ code: "INTERNAL_ERROR", message: "fallback" });
    }
  });
});
