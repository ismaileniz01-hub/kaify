import { describe, expect, it } from "vitest";
import { isBillingEventNewer } from "@/lib/billing/event-order";

describe("Paddle event order", () => {
  it("applies created → updated → canceled", () => {
    const created = {
      eventId: "e1",
      eventType: "subscription.created",
      occurredAt: "2026-01-01T00:00:00Z",
    };
    const updated = {
      eventId: "e2",
      eventType: "subscription.updated",
      occurredAt: "2026-01-01T01:00:00Z",
    };
    const canceled = {
      eventId: "e3",
      eventType: "subscription.canceled",
      occurredAt: "2026-01-01T02:00:00Z",
    };
    expect(isBillingEventNewer(updated, created)).toBe(true);
    expect(isBillingEventNewer(canceled, updated)).toBe(true);
    expect(isBillingEventNewer(updated, canceled)).toBe(false);
  });

  it("ignores delayed updated after cancel", () => {
    const canceled = {
      eventId: "e-c",
      eventType: "subscription.canceled",
      occurredAt: "2026-01-02T00:00:00Z",
    };
    const delayed = {
      eventId: "e-u",
      eventType: "subscription.updated",
      occurredAt: "2026-01-01T23:00:00Z",
    };
    expect(isBillingEventNewer(delayed, canceled)).toBe(false);
  });

  it("treats duplicate same event id as not newer", () => {
    const ev = {
      eventId: "same",
      eventType: "subscription.updated",
      occurredAt: "2026-01-01T00:00:00Z",
    };
    expect(isBillingEventNewer(ev, ev)).toBe(false);
  });

  it("same timestamp: cancel wins over update", () => {
    const ts = "2026-01-01T00:00:00Z";
    expect(
      isBillingEventNewer(
        { eventId: "b", eventType: "subscription.canceled", occurredAt: ts },
        { eventId: "a", eventType: "subscription.updated", occurredAt: ts },
      ),
    ).toBe(true);
    expect(
      isBillingEventNewer(
        { eventId: "a", eventType: "subscription.updated", occurredAt: ts },
        { eventId: "b", eventType: "subscription.canceled", occurredAt: ts },
      ),
    ).toBe(false);
  });

  it("same timestamp and rank: lexicographic event id", () => {
    const ts = "2026-01-01T00:00:00Z";
    expect(
      isBillingEventNewer(
        { eventId: "evt_b", eventType: "subscription.updated", occurredAt: ts },
        { eventId: "evt_a", eventType: "subscription.updated", occurredAt: ts },
      ),
    ).toBe(true);
  });
});
