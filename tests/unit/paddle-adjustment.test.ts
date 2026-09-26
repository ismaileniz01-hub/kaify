import { describe, expect, it } from "vitest";
import {
  classifyAdjustmentEntitlementAction,
  classifyDisputeEntitlementAction,
} from "@/lib/services/billing.service";

describe("Paddle adjustment entitlement policy", () => {
  it.each([
    [
      { action: "refund", type: "full", status: "approved" },
      "revoke",
    ],
    [
      { action: "refund", type: "partial", status: "approved" },
      "preserve",
    ],
    [
      { action: "chargeback", type: "full", status: "pending" },
      "revoke",
    ],
    [
      { action: "chargeback_warning", status: "approved" },
      "revoke",
    ],
    [
      { action: "chargeback_reverse", status: "approved" },
      "restore",
    ],
    [
      { action: "refund", type: "full", status: "rejected" },
      "preserve",
    ],
    [
      { action: "dispute", status: "open" },
      "revoke",
    ],
  ] as const)("maps %j to %s", (payload, expected) => {
    expect(
      classifyAdjustmentEntitlementAction(
        payload as Record<string, unknown>,
      ),
    ).toBe(expected);
  });
});

describe("Paddle dispute entitlement policy", () => {
  it.each([
    [{ status: "warning_under_review" }, "preserve"],
    [{ status: "open", outcome: "pending" }, "preserve"],
    [{ status: "closed", outcome: "won" }, "restore"],
    [{ status: "closed", outcome: "lost" }, "revoke"],
    [{ status: "lost" }, "revoke"],
    [{ outcome: "won" }, "restore"],
  ] as const)("maps %j to %s", (payload, expected) => {
    expect(
      classifyDisputeEntitlementAction(payload as Record<string, unknown>),
    ).toBe(expected);
  });
});

describe("Paddle adjustment entitlement policy", () => {
  it.each([
    [
      { action: "refund", type: "full", status: "approved" },
      "revoke",
    ],
    [
      { action: "refund", type: "partial", status: "approved" },
      "preserve",
    ],
    [
      { action: "chargeback", type: "full", status: "pending" },
      "revoke",
    ],
    [
      { action: "chargeback_warning", status: "approved" },
      "revoke",
    ],
    [
      { action: "chargeback_reverse", status: "approved" },
      "restore",
    ],
    [
      { action: "refund", type: "full", status: "rejected" },
      "preserve",
    ],
  ] as const)("maps %j to %s", (payload, expected) => {
    expect(
      classifyAdjustmentEntitlementAction(
        payload as Record<string, unknown>,
      ),
    ).toBe(expected);
  });
});
