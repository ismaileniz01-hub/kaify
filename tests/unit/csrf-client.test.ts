import { describe, expect, it } from "vitest";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  readCsrfCookieFromDocument,
} from "@/lib/security/csrf-client";

describe("csrf-client", () => {
  it("exports stable cookie/header names", () => {
    expect(CSRF_COOKIE_NAME).toBe("kaify_csrf");
    expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
  });

  it("returns null outside the browser", () => {
    expect(readCsrfCookieFromDocument()).toBeNull();
  });
});
