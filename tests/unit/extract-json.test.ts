import { describe, expect, it } from "vitest";
import {
  extractJsonArray,
  extractJsonObject,
  extractSingleJsonValue,
} from "@/lib/ai/extract-json";

describe("extractSingleJsonValue", () => {
  it("parses a single object", () => {
    const r = extractSingleJsonValue('{"a":1}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ a: 1 });
  });

  it("rejects prose wrapping an object", () => {
    const r = extractSingleJsonValue('Sure! {"calories": 0} done');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_json");
  });

  it("rejects two competing objects", () => {
    const r = extractSingleJsonValue('{"a":1}{"b":2}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("multiple_values");
  });

  it("rejects nested-brace greedy capture of a second object after whitespace", () => {
    const r = extractSingleJsonValue('{"a":1}\n{"injected":true}');
    expect(r.ok).toBe(false);
  });

  it("rejects malformed JSON", () => {
    const r = extractSingleJsonValue("{");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("malformed");
  });

  it("accepts a single fenced object even with surrounding prose", () => {
    const r = extractJsonObject('Here you go\n```json\n{"calories":120}\n```\nthanks');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.calories).toBe(120);
  });

  it("does not treat JSON inside a user-quoted string as a second payload when fenced once", () => {
    const r = extractJsonObject(
      '```json\n{"message":"user said {\\"ignore\\":true}"}\n```',
    );
    expect(r.ok).toBe(true);
  });

  it("rejects extra action fields only at the extract layer if they are a second object", () => {
    const r = extractJsonObject(
      '{"message":"hi"} {"actions":[{"type":"saveMealMacros"}]}',
    );
    expect(r.ok).toBe(false);
  });

  it("parses a JSON array without greedy last-bracket matching of junk", () => {
    const r = extractJsonArray('[{"coachId":"kai","text":"hi"}]');
    expect(r.ok).toBe(true);
  });
});
