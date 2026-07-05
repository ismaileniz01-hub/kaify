import { describe, expect, it } from "vitest";
import { USER_EXPORT_TABLES } from "@/lib/compliance/export-tables";
import {
  CASCADE_ON_DELETE_TABLES,
  EXPLICIT_CLEANUP,
  RETAINED_AFTER_DELETE,
  THIRD_PARTY_POST_DELETE,
} from "@/lib/compliance/deletion-config";

describe("deletion completeness", () => {
  it("cascades every exported user-owned table except retained audit tables", () => {
    const cascaded = new Set(CASCADE_ON_DELETE_TABLES.map((t) => t.table));
    const retained = new Set(RETAINED_AFTER_DELETE.map((t) => t.table));

    for (const { table } of USER_EXPORT_TABLES) {
      if (retained.has(table)) continue;
      expect(cascaded.has(table), `${table} must CASCADE on delete`).toBe(true);
    }
  });

  it("documents billing_events as SET NULL (not CASCADE)", () => {
    const billing = RETAINED_AFTER_DELETE.find((t) => t.table === "billing_events");
    expect(billing?.behavior).toBe("set_null");
  });

  it("documents explicit storage and auth cleanup", () => {
    const targets = EXPLICIT_CLEANUP.map((t) => t.table);
    expect(targets).toContain("storage:avatars");
    expect(targets).toContain("auth.users");
  });

  it("lists third-party post-delete retention", () => {
    expect(THIRD_PARTY_POST_DELETE.length).toBeGreaterThanOrEqual(2);
    expect(THIRD_PARTY_POST_DELETE.some((s) => s.includes("Sentry"))).toBe(true);
  });

  it("has no duplicate cascade table entries", () => {
    const names = CASCADE_ON_DELETE_TABLES.map((t) => t.table);
    expect(new Set(names).size).toBe(names.length);
  });
});
