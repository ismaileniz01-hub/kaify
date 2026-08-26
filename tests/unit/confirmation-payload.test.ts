import { describe, expect, it } from "vitest";
import {
  confirmationCardFromPending,
  mergeConfirmationStamp,
  mergeCorrectedAnalyticsPayload,
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

describe("corrected meal payload", () => {
  it("keeps water when the user edits calories", () => {
    const next = mergeCorrectedAnalyticsPayload(
      {
        summary: "650 kcal + 0.25L water",
        meal: { calories: 650, protein: 38, carbs: 65, fat: 28 },
        patch: { waterLiters: 1.25 },
      },
      { calories: 700, protein: 40, carbs: 65, fat: 28 },
    );
    expect(next.meal).toEqual({
      calories: 700,
      protein: 40,
      carbs: 65,
      fat: 28,
    });
    expect(next.patch).toEqual({ waterLiters: 1.25 });
  });

  it("seeds the chat card with meal macros", () => {
    expect(
      confirmationCardFromPending("p1", {
        summary: "650 kcal",
        meal: { calories: 650, protein: 38, carbs: 65, fat: 28 },
        patch: { waterLiters: 0.25 },
      }),
    ).toMatchObject({
      pendingId: "p1",
      calories: 650,
      protein: 38,
    });
  });
});
