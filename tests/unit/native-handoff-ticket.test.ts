import { describe, expect, it } from "vitest";
import {
  consumeNativeHandoffTicket,
  issueNativeHandoffTicket,
} from "@/lib/auth/native-handoff-ticket";

describe("native handoff tickets", () => {
  it("issues a sealed ticket and consumes it once without Redis", async () => {
    const tokens = {
      accessToken: "a".repeat(24),
      refreshToken: "r".repeat(16),
    };
    const ticket = await issueNativeHandoffTicket(tokens);
    expect(ticket.startsWith("s.")).toBe(true);
    await expect(consumeNativeHandoffTicket(ticket)).resolves.toEqual(tokens);
  });

  it("rejects missing or garbage tickets", async () => {
    await expect(consumeNativeHandoffTicket("")).resolves.toBeNull();
    await expect(consumeNativeHandoffTicket("nope")).resolves.toBeNull();
    await expect(consumeNativeHandoffTicket("s.not-valid")).resolves.toBeNull();
  });
});
