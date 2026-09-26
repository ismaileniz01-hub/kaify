import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_PROPERTY_KEYS,
  PRODUCT_EVENT_NAMES,
  sanitizeProductEvent,
} from "@/lib/events/product-catalog";
import { isQuietHour } from "@/lib/notifications/quiet-hours";
import { resolveWeeklyReview } from "@/lib/activation/weekly-review";
import { resolveTodayJob } from "@/lib/activation/today-job";
import { COACH_STARTERS } from "@/lib/chat/starters";
import { PLAN_COMPARISON, PRICING_PLANS } from "@/lib/marketing/pricing-plans";
import { signupBasicsSchema } from "@/lib/validations/signup-basics.schema";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("F2 product events allowlist", () => {
  it("covers eleven families without PII keys", () => {
    expect(PRODUCT_EVENT_NAMES.length).toBeGreaterThan(40);
    expect(FORBIDDEN_PROPERTY_KEYS).toContain("email");
    expect(FORBIDDEN_PROPERTY_KEYS).toContain("referral_code");
  });

  it("rejects email and raw referral payloads", () => {
    expect(
      sanitizeProductEvent({
        name: "signup.otp_requested",
        properties: { email: "a@b.com" },
        idempotencyKey: "x".repeat(12),
      }),
    ).toMatchObject({ error: expect.stringContaining("email") });
    expect(
      sanitizeProductEvent({
        name: "referral.shared",
        properties: { referral_code: "ABC123" },
        idempotencyKey: "y".repeat(12),
      }),
    ).toMatchObject({ error: expect.stringContaining("referral_code") });
  });

  it("accepts hashed campaign ids", () => {
    const ok = sanitizeProductEvent({
      name: "referral.shared",
      properties: { channel: "os", campaign_id: "abcd1234abcd1234" },
      idempotencyKey: "z".repeat(12),
    });
    expect(ok).not.toHaveProperty("error");
  });
});

describe("F2 trust claims", () => {
  it("uses numeric monthly token limits", () => {
    expect(PRICING_PLANS[0].perks.join(" ")).toMatch(/1M coaching tokens/);
    expect(PLAN_COMPARISON.find((row) => row.label.includes("capacity"))?.essential).toBe(
      "1M tokens / month",
    );
  });

  it("does not claim human coaches in English source copy", () => {
    const en = JSON.parse(
      readFileSync(join(process.cwd(), "lib/lang/en.json"), "utf8"),
    ) as Record<string, string>;
    expect(en["landing.coaches.intro"].toLowerCase()).toContain("ai");
    expect(en["landing.coaches.intro"].toLowerCase()).not.toContain("real coaches");
    expect(en["landing.leaderboard.live_note"].toLowerCase()).not.toContain("live rankings update daily");
  });
});

describe("F2 progressive signup", () => {
  it("requires only name, birth date, and country before checkout", () => {
    expect(
      signupBasicsSchema.safeParse({
        displayName: "Ada",
        birthDate: "1999-01-01",
        countryCode: "tr",
        locale: "en",
      }).success,
    ).toBe(true);
  });

  it("keeps the packaged signup flow short", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/SignupWizard.tsx"),
      "utf8",
    );
    const full = src.match(/const FULL_FLOW[\s\S]*?;/)?.[0] ?? "";
    expect(full).toContain('"email"');
    expect(full).toContain('"verify"');
    expect(full).not.toContain('"lifestyle"');
  });
});

describe("F2 weekly review and recovery", () => {
  it("picks one next action", () => {
    expect(resolveWeeklyReview({ workouts: 0, meals: 4, waterDays: 4, streak: 5 }).nextAction).toBe(
      "log_workout",
    );
    expect(resolveWeeklyReview({ workouts: 5, meals: 7, waterDays: 7, streak: 10 }).nextAction).toBe(
      "continue",
    );
  });

  it("uses a guilt-free recovery task after inactivity", () => {
    const job = resolveTodayJob({
      checkedInToday: false,
      goalsConfigured: true,
      inactivityDays: 14,
    });
    expect(job.recovery).toBe(true);
    expect(job.kind).toBe("check_in");
  });
});

describe("F2 notification quiet hours", () => {
  it("suppresses overnight windows", () => {
    expect(isQuietHour(23, 22, 7)).toBe(true);
    expect(isQuietHour(8, 22, 7)).toBe(false);
    expect(isQuietHour(12, null, null)).toBe(false);
  });
});

describe("F2 coach starters", () => {
  it("ships role-specific starters including Leo safety copy key", () => {
    expect(COACH_STARTERS.alex.length).toBeGreaterThan(0);
    expect(COACH_STARTERS.leo.some((row) => row.id.includes("scan"))).toBe(true);
  });
});

describe("F2 event family producers", () => {
  it("emits at least one event in each of the eleven families", () => {
    const roots = [
      readFileSync(join(process.cwd(), "lib/events/product.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/services/home.service.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/services/billing.service.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/services/notifications.service.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/services/analytics-confirmation.service.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/services/referral.service.ts"), "utf8"),
      readFileSync(join(process.cwd(), "app/api/events/route.ts"), "utf8"),
      readFileSync(join(process.cwd(), "native-app/src/App.tsx"), "utf8"),
    ].join("\n");
    for (const family of [
      "acquisition.",
      "native.",
      "signup.",
      "onboarding.",
      "activation.",
      "session.",
      "notification.",
      "billing.",
      "reactivation.",
      "referral.",
      "scan.",
    ]) {
      expect(roots, family).toContain(family);
    }
  });
});
