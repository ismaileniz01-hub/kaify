import { describe, expect, it } from "vitest";
import { hashUserId, scrubSentryEvent } from "@/lib/sentry/scrub";
import type { ErrorEvent } from "@sentry/nextjs";

describe("scrubSentryEvent", () => {
  it("hashes user id and drops email/ip", () => {
    const event = scrubSentryEvent({
      user: {
        id: "user-123",
        email: "a@b.com",
        username: "alex",
        ip_address: "1.2.3.4",
      },
      message: "Failed for a@b.com",
    } as unknown as ErrorEvent);

    expect(event.user?.email).toBeUndefined();
    expect(event.user?.username).toBeUndefined();
    expect(event.user?.ip_address).toBeUndefined();
    expect(event.user?.id).toBe(hashUserId("user-123"));
    expect(event.message).toBe("Failed for [email redacted]");
  });

  it("scrubs breadcrumbs, extras, and request bodies", () => {
    const event = scrubSentryEvent({
      breadcrumbs: [
        {
          message: "posted token=secret to user@x.com",
          data: { authorization: "Bearer abc", note: "ok" },
        },
      ],
      extra: { password: "hunter2", nested: { email: "x@y.z" } },
      request: {
        cookies: { a: "1" },
        headers: { authorization: "Bearer xyz", "content-type": "application/json" },
        data: { token: "abc", safe: "keep" },
        query_string: "email=user@x.com&q=1",
      },
    } as unknown as ErrorEvent);

    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.headers?.authorization).toBeUndefined();
    expect(event.request?.headers?.["content-type"]).toBe("application/json");
    expect(event.request?.data).toEqual({ token: "[redacted]", safe: "keep" });
    expect(event.request?.query_string).toContain("[email redacted]");
    expect(event.extra).toEqual({ password: "[redacted]", nested: { email: "[redacted]" } });
    expect(event.breadcrumbs?.[0]?.message).toContain("[email redacted]");
    expect(event.breadcrumbs?.[0]?.data?.authorization).toBe("[redacted]");
  });
});
