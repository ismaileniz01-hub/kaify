/** Sunday UTC week key for team meeting rate limiting / uniqueness. */
export function teamMeetingWeekKey(now = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
