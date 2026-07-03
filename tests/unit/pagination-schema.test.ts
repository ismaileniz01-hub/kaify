import { describe, expect, it } from "vitest";
import { paginationQuerySchema } from "@/lib/validations/pagination.schema";

describe("paginationQuerySchema", () => {
  it("applies defaults when empty", () => {
    const parsed = paginationQuerySchema.parse({});
    expect(parsed).toEqual({ limit: 25, offset: 0 });
  });

  it("coerces string query params to numbers", () => {
    const parsed = paginationQuerySchema.parse({ limit: "50", offset: "10" });
    expect(parsed).toEqual({ limit: 50, offset: 10 });
  });

  it("rejects a limit above the max", () => {
    expect(paginationQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("rejects a negative offset", () => {
    expect(paginationQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);
  });

  it("rejects a zero limit", () => {
    expect(paginationQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
  });
});
