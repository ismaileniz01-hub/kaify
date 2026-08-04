import { describe, expect, it } from "vitest";
import { teamMeetingWeekKey } from "@/lib/team/meeting-week";

describe("teamMeetingWeekKey", () => {
  it("returns Sunday UTC date for a mid-week timestamp", () => {
    // Wednesday 2026-08-05 → Sunday 2026-08-02
    expect(teamMeetingWeekKey(new Date("2026-08-05T15:00:00.000Z"))).toBe(
      "2026-08-02",
    );
  });

  it("keeps Sunday itself", () => {
    expect(teamMeetingWeekKey(new Date("2026-08-02T00:00:00.000Z"))).toBe(
      "2026-08-02",
    );
  });
});
