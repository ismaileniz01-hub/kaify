import { describe, expect, it } from "vitest";
import { toSpanAttributes } from "@/lib/observability/to-span-attributes";

describe("toSpanAttributes", () => {
  it("includes request id and drops nullish meta", () => {
    expect(
      toSpanAttributes(
        { auth: "user", method: "GET", unused: null, skip: undefined },
        "req_123",
      ),
    ).toEqual({
      "request.id": "req_123",
      auth: "user",
      method: "GET",
    });
  });

  it("works without request id or meta", () => {
    expect(toSpanAttributes(undefined, null)).toEqual({});
    expect(toSpanAttributes({ n: 1 }, null)).toEqual({ n: 1 });
  });
});
