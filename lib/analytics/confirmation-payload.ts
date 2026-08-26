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
