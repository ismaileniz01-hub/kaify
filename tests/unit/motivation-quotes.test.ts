import { describe, expect, it } from "vitest";
import en from "@/lib/motivation-quotes/en.json";
import {
  dailyQuoteIndex,
  getDailyMotivationQuote,
  MOTIVATION_QUOTE_COUNT,
} from "@/lib/motivation-quotes";

describe("motivation quotes", () => {
  it("has at least 100 quotes in English source", () => {
    expect(en.length).toBe(MOTIVATION_QUOTE_COUNT);
    expect(en.length).toBeGreaterThanOrEqual(100);
  });

  it("each quote includes an author attribution", () => {
    for (const quote of en) {
      expect(quote).toMatch(/ — /);
    }
  });

  it("picks a stable quote for the day", async () => {
    const date = new Date(Date.UTC(2026, 6, 6));
    const a = await getDailyMotivationQuote("en", date);
    const b = await getDailyMotivationQuote("en", date);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("quotes avoid sport-branch jargon", () => {
    const sportBranch = en.filter((q) =>
      /\b(ball|court|pitch|wrestl|marathon|hockey|soccer|football|basketball|tennis|boxing|golf|platform|podium|match\b|bodybuilder)\b/i.test(
        q,
      ),
    );
    expect(sportBranch).toEqual([]);
  });

  it("quotes are fitness and training themed", () => {
    const nonFitness = en.filter(
      (q) =>
        /Camus|Angelou|Churchill|Twain|Disney|Jobs|Pamuk|Neruda|Confucius|Rilke|Emerson/.test(
          q,
        ),
    );
    expect(nonFitness).toEqual([]);
  });

  it("has no Unknown author attributions", () => {
    for (const quote of en) {
      expect(quote).not.toMatch(/ — Unknown/);
    }
  });

  it("returns Turkish quotes for tr locale", async () => {
    const tr = await getDailyMotivationQuote("tr");
    const enQuote = await getDailyMotivationQuote("en");
    expect(tr).not.toBe(enQuote);
    expect(tr).toMatch(/ — /);
  });
});
