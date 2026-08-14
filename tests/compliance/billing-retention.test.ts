import { describe, expect, it } from "vitest";
import {
  billingPayloadContainsPii,
  minimizeBillingPayload,
} from "@/lib/privacy/billing-payload";
import { RETENTION } from "@/lib/compliance/retention-config";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("billing payload minimization (SEC-006)", () => {
  const raw = {
    event_id: "evt_1",
    event_type: "subscription.created",
    occurred_at: "2026-08-01T00:00:00Z",
    data: {
      id: "sub_1",
      status: "active",
      customer_id: "ctm_1",
      email: "buyer@example.com",
      address: { country: "TR" },
      items: [{ price: { id: "pri_1" } }],
    },
  };

  it("drops PII while keeping operational identifiers", () => {
    const mini = minimizeBillingPayload(raw);
    expect(mini.minimized).toBe(true);
    expect(mini.event_id).toBe("evt_1");
    expect((mini.data as Record<string, unknown>).id).toBe("sub_1");
    expect(JSON.stringify(mini)).not.toContain("buyer@example.com");
    expect(JSON.stringify(mini)).not.toContain("address");
    expect(billingPayloadContainsPii(raw)).toBe(true);
    expect(billingPayloadContainsPii(mini)).toBe(false);
  });

  it("registers 7-year billing_events retention from existing policy", () => {
    expect(RETENTION.billingEventsMonths).toBe(84);
    const purge = readFileSync(
      join(process.cwd(), "lib/services/retention-purge.service.ts"),
      "utf8",
    );
    expect(purge).toContain("billing_events");
    expect(purge).toContain("RETENTION.billingEventsMonths");
  });

  it("inserts minimized payloads from the billing service", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/services/billing.service.ts"),
      "utf8",
    );
    expect(src).toContain("minimizeBillingPayload");
  });
});
