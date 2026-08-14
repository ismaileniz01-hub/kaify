/** Retention periods for automated purge (Compliance Faz 3). */

export const RETENTION = {
  chatMonths: 24,
  coachingMemoryMonths: 24,
  analyticsMonths: 36,
  healthStepsMonths: 36,
  aiUsageLedgerMonths: 24,
  notificationsMonths: 12,
  dataExportLogsMonths: 24,
  adminAuditDays: 90,
  /**
   * billing_events row retention. Matches docs/compliance/retention-policy.md
   * (7 years / tax-accounting). OWNER_REVIEW if legal counsel revises.
   */
  billingEventsMonths: 84,
} as const;

export const RETENTION_WARNING_DAYS = 30;

export function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString();
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export function monthsAgoDate(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
