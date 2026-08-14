import { describe, expect, it } from "vitest";
import { registryTableNames } from "./schema-registry";
import { retentionTableNames } from "@/lib/compliance/retention-registry";

describe("retention completeness", () => {
  it("every schema-registry table has a retention decision", () => {
    const schema = registryTableNames();
    const retention = retentionTableNames();
    expect(retention).toEqual(schema);
  });
});
