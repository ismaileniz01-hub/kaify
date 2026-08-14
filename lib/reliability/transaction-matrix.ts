export type TransactionClass =
  | "ATOMIC_TRANSACTION"
  | "IDEMPOTENT_MULTI_STEP"
  | "OUTBOX_COMPENSATED"
  | "BEST_EFFORT_NON_CANONICAL"
  | "RISK";

export type TransactionMatrixRow = {
  flow: string;
  classification: TransactionClass;
  note: string;
};

export const CRITICAL_TRANSACTION_MATRIX: readonly TransactionMatrixRow[] = [
  { flow: "billing webhook apply/revoke", classification: "IDEMPOTENT_MULTI_STEP", note: "claim/finalize/release + stale-event skip; apply_subscription RPC then profile writes" },
  { flow: "gems earn/spend", classification: "ATOMIC_TRANSACTION", note: "ledger insert + kai balance in one plpgsql xact; unique idempotency_key" },
  { flow: "market purchase", classification: "ATOMIC_TRANSACTION", note: "purchase_market_item RPC" },
  { flow: "analytics confirm", classification: "ATOMIC_TRANSACTION", note: "confirm_analytics_pending claims then upserts" },
  { flow: "check-in", classification: "ATOMIC_TRANSACTION", note: "perform_daily_check_in" },
  { flow: "account deletion", classification: "IDEMPOTENT_MULTI_STEP", note: "FK cascades + cache purge outbox" },
  { flow: "council / team meeting", classification: "ATOMIC_TRANSACTION", note: "team_meeting_weeks unique week lock" },
  { flow: "meal save", classification: "ATOMIC_TRANSACTION", note: "increment_analytics_meals" },
  { flow: "chat persist + quota", classification: "IDEMPOTENT_MULTI_STEP", note: "quota reserve then messages; unique idempotency; refund on empty failure" },
  { flow: "AI analytics extract", classification: "BEST_EFFORT_NON_CANONICAL", note: "pending confirmation; user confirm is canonical" },
];
