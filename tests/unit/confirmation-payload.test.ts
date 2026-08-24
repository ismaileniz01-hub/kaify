import { describe, expect, it } from "vitest";
import {
  mergeConfirmationStamp,
  resolvedConfirmationStatus,
} from "@/lib/analytics/confirmation-payload";

describe("confirmation payload stamp", () => {
  it("marks a pending card as confirmed without dropping pendingId", () => {
    const next = mergeConfirmationStamp(
      {
        saved: false,
        confirmation: { pendingId: "p1", summary: "Meal logged" },
      },
      "confirmed",
    );
    expect(next.saved).toBe(true);
    expect(next.confirmation).toMatchObject({
      pendingId: "p1",
      summary: "Meal logged",
      status: "confirmed",
    });
  });

  it("treats confirmed and rejected as resolved", () => {
    expect(resolvedConfirmationStatus({ status: "confirmed" })).toBe("confirmed");
    expect(resolvedConfirmationStatus({ status: "rejected" })).toBe("rejected");
    expect(resolvedConfirmationStatus({ status: "pending" })).toBeNull();
    expect(resolvedConfirmationStatus(undefined)).toBeNull();
  });
});
