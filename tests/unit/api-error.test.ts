import { describe, expect, it } from "vitest";
import { apiErrorMessage, errorToMessage } from "@/lib/i18n/api-error";

const t = (key: string) => `L:${key}`;

describe("api error taxonomy (UX-004)", () => {
  it("maps known codes without using the raw server string", () => {
    expect(apiErrorMessage("STREAM_ERROR", t)).toBe("L:errors.STREAM_ERROR");
    expect(apiErrorMessage("RATE_LIMITED", t)).toBe("L:errors.RATE_LIMITED");
    expect(apiErrorMessage("UPLOAD_TOO_LARGE", t)).toBe("L:errors.UPLOAD_TOO_LARGE");
  });

  it("falls back safely for unknown codes", () => {
    expect(apiErrorMessage("TOTALLY_FAKE", t)).toBe("L:errors.INTERNAL_ERROR");
    expect(apiErrorMessage(null, t)).toBe("L:errors.INTERNAL_ERROR");
  });

  it("does not parse natural-language messages", () => {
    expect(
      errorToMessage({ message: "Akış sırasında bir hata oluştu." }, t),
    ).toBe("L:errors.INTERNAL_ERROR");
    expect(errorToMessage({ code: "FORBIDDEN", message: "Geçersiz koç." }, t)).toBe(
      "L:errors.FORBIDDEN",
    );
  });
});
