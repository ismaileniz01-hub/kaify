export type ConfirmationStatus = "pending" | "confirmed" | "rejected";

export type ChatConfirmationPayload = {
  pendingId: string;
  summary: string;
  status?: ConfirmationStatus;
  confidence?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type PendingAnalyticsPayload = {
  summary: string;
  patch?: Record<string, number>;
  meal?: { calories: number; protein: number; carbs: number; fat: number };
};

/** Keep water/workout extras when the user edits macros on the confirm card. */
export function mergeCorrectedAnalyticsPayload(
  current: PendingAnalyticsPayload,
  meal: { calories: number; protein: number; carbs: number; fat: number },
): PendingAnalyticsPayload {
  const patch = { ...(current.patch ?? {}) };
  delete patch.caloriesConsumed;
  delete patch.calories_consumed;
  delete patch.proteinG;
  delete patch.protein_g;
  delete patch.carbsG;
  delete patch.carbs_g;
  delete patch.fatG;
  delete patch.fat_g;
  return {
    ...current,
    meal,
    patch: Object.keys(patch).length > 0 ? patch : undefined,
  };
}

export function confirmationCardFromPending(
  pendingId: string,
  payload: PendingAnalyticsPayload,
): ChatConfirmationPayload {
  return {
    pendingId,
    summary: payload.summary,
    calories: payload.meal?.calories,
    protein: payload.meal?.protein,
    carbs: payload.meal?.carbs,
    fat: payload.meal?.fat,
  };
}

export function resolvedConfirmationStatus(
  confirmation: { status?: string } | null | undefined,
): "confirmed" | "rejected" | null {
  if (confirmation?.status === "confirmed" || confirmation?.status === "rejected") {
    return confirmation.status;
  }
  return null;
}

export function mergeConfirmationStamp(
  payload: unknown,
  status: "confirmed" | "rejected",
): Record<string, unknown> {
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};
  const existing =
    base.confirmation &&
    typeof base.confirmation === "object" &&
    !Array.isArray(base.confirmation)
      ? { ...(base.confirmation as Record<string, unknown>) }
      : {};
  return {
    ...base,
    saved: status === "confirmed",
    confirmation: {
      ...existing,
      status,
    },
  };
}
