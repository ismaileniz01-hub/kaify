import { describe, expect, it } from "vitest";
import * as domains from "@/lib/domains";

describe("domain facades", () => {
  it("exports all bounded contexts", () => {
    expect(domains.auth).toBeDefined();
    expect(domains.market).toBeDefined();
    expect(domains.ai).toBeDefined();
    expect(domains.billing).toBeDefined();
    expect(domains.compliance).toBeDefined();
    expect(domains.platform).toBeDefined();
  });

  it("market facade exposes catalog service", () => {
    expect(typeof domains.market.getMarketState).toBe("function");
    expect(typeof domains.market.purchaseMarketItem).toBe("function");
  });

  it("compliance facade exposes export tables", () => {
    expect(domains.compliance.USER_EXPORT_TABLES.length).toBeGreaterThan(20);
  });

  it("ai facade exposes chat + team helpers", () => {
    expect(typeof domains.ai.getHistory).toBe("function");
    expect(typeof domains.ai.analyzePhoto).toBe("function");
    expect(typeof domains.ai.assertTeamChatUnlocked).toBe("function");
    expect(typeof domains.ai.teamMeetingWeekKey).toBe("function");
  });

  it("billing facade exposes paddle verify + handle", () => {
    expect(typeof domains.billing.verifyAndParsePaddleWebhook).toBe("function");
    expect(typeof domains.billing.handleNormalizedPaddleEvent).toBe("function");
  });
});
