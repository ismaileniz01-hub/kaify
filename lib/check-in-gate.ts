import { localTodayDate } from "@/lib/date-utils";

/** True when the streak row already records a check-in for the user's local day. */
export function alreadyCheckedInOnLocalDay(
  lastCheckInDate: string | null,
  timezone = "UTC",
): boolean {
  if (!lastCheckInDate) return false;
  return lastCheckInDate === localTodayDate(timezone);
}
