import { describe, expect, it } from "vitest";
import {
  markMessageDelivered,
  markMessageFailed,
  shouldReuseIdempotencyKeyOnRetry,
} from "@/lib/chat/message-lifecycle";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("chat message lifecycle (UX-005 + A11Y-001)", () => {
  it("marks failed without removing the message", () => {
    const messages = [
      { id: "u1", status: "sending" as const, idempotencyKey: "k1" },
      { id: "c1", status: "sending" as const },
    ];
    const next = markMessageFailed(messages, "u1");
    expect(next.find((m) => m.id === "u1")?.status).toBe("failed");
    expect(next).toHaveLength(2);
  });

  it("marks delivered on success", () => {
    const next = markMessageDelivered(
      [{ id: "u1", status: "sending" as const }],
      "u1",
    );
    expect(next[0]?.status).toBe("delivered");
  });

  it("reuses idempotency key only for failed messages that still have one", () => {
    expect(shouldReuseIdempotencyKeyOnRetry("failed", "abc")).toBe(true);
    expect(shouldReuseIdempotencyKeyOnRetry("sending", "abc")).toBe(false);
    expect(shouldReuseIdempotencyKeyOnRetry("failed", undefined)).toBe(false);
  });

  it("LiveChatPanel wires failed status, retry, and accessible log", () => {
    const src = readFileSync(
      join(process.cwd(), "components/chat/LiveChatPanel.tsx"),
      "utf8",
    );
    expect(src).toContain('role="log"');
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain("chat.message.failed");
    expect(src).toContain("chat.a11y.typing");
    expect(src).toContain("shouldReuseIdempotencyKeyOnRetry");
    expect(src).toContain("createIdempotencyKey");
    expect(src).toContain("streamTextRef.current");
    expect(src).toContain("sticky bottom-3");
  });
});
