import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_VISUAL,
  visualFor,
} from "@/lib/notifications/config";
import type { NotificationType } from "@/lib/types/database.types";

const ALL_TYPES: NotificationType[] = [
  "streak_risk",
  "streak_milestone",
  "kai_level_up",
  "freezie_earned",
  "badge",
  "weekly_summary",
  "water_reminder",
  "praise",
  "system",
];

describe("notification visual config", () => {
  it("has a visual entry for every notification type", () => {
    for (const type of ALL_TYPES) {
      expect(NOTIFICATION_VISUAL[type]).toBeDefined();
    }
  });

  it("every visual has a valid hex color and avatar path", () => {
    for (const type of ALL_TYPES) {
      const v = NOTIFICATION_VISUAL[type];
      expect(v.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(v.avatar.startsWith("/")).toBe(true);
    }
  });

  it("maps water_reminder to Dr. Maya and weekly_summary to Alex", () => {
    expect(visualFor("water_reminder").from).toBe("Dr. Maya");
    expect(visualFor("weekly_summary").from).toBe("Alex");
  });

  it("falls back to the system visual for unknown types", () => {
    const unknown = visualFor("totally_unknown" as NotificationType);
    expect(unknown).toEqual(NOTIFICATION_VISUAL.system);
  });
});
