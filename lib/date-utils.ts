/** Calendar date (YYYY-MM-DD) in the given IANA timezone. */
export function localTodayDate(timezone = "UTC"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** True when `isoTimestamp` falls on `entryDate` in the user's timezone. */
export function isLocalDate(isoTimestamp: string, entryDate: string, timezone: string): boolean {
  try {
    const local = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
      new Date(isoTimestamp),
    );
    return local === entryDate;
  } catch {
    return isoTimestamp.slice(0, 10) === entryDate;
  }
}

/** UTC midnight bounds covering ±1 local day around `entryDate` (for DB range scans). */
export function localDayQueryWindow(entryDate: string, timezone: string): {
  start: string;
  end: string;
} {
  try {
    const probe = new Date(`${entryDate}T12:00:00`);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(probe);
    const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const match = offsetPart.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    let offsetMinutes = 0;
    if (match) {
      const sign = match[1].startsWith("-") ? -1 : 1;
      const hours = Math.abs(Number.parseInt(match[1], 10));
      const mins = match[2] ? Number.parseInt(match[2], 10) : 0;
      offsetMinutes = sign * (hours * 60 + mins);
    }
    const startMs = Date.parse(`${entryDate}T00:00:00.000Z`) - offsetMinutes * 60_000;
    const endMs = startMs + 86_400_000;
    return {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
    };
  } catch {
    return {
      start: `${entryDate}T00:00:00.000Z`,
      end: `${entryDate}T23:59:59.999Z`,
    };
  }
}
