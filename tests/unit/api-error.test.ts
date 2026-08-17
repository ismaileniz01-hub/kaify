import { describe, expect, it } from "vitest";
import {
  apiErrorMessage,
  errorToMessage,
  isAnalyzeQuotaDenied,
  visionQuotaResourceFromError,
} from "@/lib/i18n/api-error";

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

  it("maps quota exhaustion to the specific limit copy, not generic FORBIDDEN", () => {
    expect(
      errorToMessage(
        {
          code: "FORBIDDEN",
          details: { warning_trigger: "LIMIT_100", resource: "maya_photo" },
        },
        t,
      ),
    ).toBe("L:errors.QUOTA_MAYA_PHOTO");
    expect(
      errorToMessage(
        {
          code: "QUOTA_EXCEEDED",
          details: { resource: "maya_photo" },
        },
        t,
      ),
    ).toBe("L:errors.QUOTA_MAYA_PHOTO");
  });

  it("maps Maya analyze quota without details to the photo limit copy", () => {
    expect(
      visionQuotaResourceFromError("maya", { code: "QUOTA_EXCEEDED" }),
    ).toBe("maya_photo");
    expect(
      isAnalyzeQuotaDenied({ quotaExceeded: true, resource: "maya_photo" }),
    ).toBe(true);
  });
});
