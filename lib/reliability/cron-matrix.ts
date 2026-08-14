export type CronExecutionClass =
  | "BOUNDED_AND_RESUMABLE"
  | "BOUNDED_IDEMPOTENT"
  | "SINGLE_SHOT_SAFE"
  | "UNSAFE";

export type CronMatrixRow = {
  job: string;
  classification: CronExecutionClass;
  note: string;
};

export const CRON_EXECUTION_MATRIX: readonly CronMatrixRow[] = [
  { job: "retention-purge", classification: "BOUNDED_AND_RESUMABLE", note: "Wave 1 budget + tableIndex cursor" },
  { job: "cleanup", classification: "BOUNDED_AND_RESUMABLE", note: "streak page cursor + 45s budget; idempotency prune is bounded delete" },
  { job: "outbox", classification: "BOUNDED_AND_RESUMABLE", note: "batch 100 + wall budget; processed_at claim" },
  { job: "notifications", classification: "BOUNDED_AND_RESUMABLE", note: "profile keyset + cursor; dedup_key prevents duplicate side effects" },
  { job: "leaderboard-snapshot", classification: "BOUNDED_IDEMPOTENT", note: "fixed limit snapshot upsert; rank() cost residual Wave 5" },
  { job: "cost-check", classification: "BOUNDED_IDEMPOTENT", note: "aggregate snapshot + alert insert; repeats are safe" },
  { job: "self-recovery", classification: "SINGLE_SHOT_SAFE", note: "probes DB + resets local circuits; Redis shared state remains" },
  { job: "backup-verification", classification: "SINGLE_SHOT_SAFE", note: "manifest snapshot; low volume" },
];
