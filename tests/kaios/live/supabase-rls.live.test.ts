/**
 * LIVE Supabase multi-user RLS / ownership validation.
 * Requires dual synthetic users + JWTs + service role.
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  confirmPendingAnalytics,
  createPendingAnalyticsConfirmation,
  rejectPendingAnalytics,
} from "@/lib/services/analytics-confirmation.service";
import { liveCredentials, skipReason } from "./credentials";

function userClient(jwt: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("LIVE Supabase multi-user security", () => {
  const creds = liveCredentials();

  it("rejects cross-user pending confirm and forged userId paths", async () => {
    if (!creds.supabase || !creds.supabaseServiceRole || !creds.dualUser) {
      console.warn(
        skipReason("dualUser") +
          " (also needs NEXT_PUBLIC_SUPABASE_* + SUPABASE_SERVICE_ROLE_KEY)",
      );
      return;
    }

    const userA = process.env.KAIOS_LIVE_USER_A_ID!;
    const userB = process.env.KAIOS_LIVE_USER_B_ID!;
    const jwtB = process.env.KAIOS_LIVE_USER_B_JWT!;

    const pendingId = await createPendingAnalyticsConfirmation({
      userId: userA,
      coachId: "maya",
      source: "chat",
      payload: {
        summary: "LIVE RLS test meal",
        meal: { calories: 100, protein: 10, carbs: 10, fat: 2 },
      },
    });

    const findings: Array<Record<string, unknown>> = [];

    // Wrong owner confirm must fail
    let crossConfirmRejected = false;
    try {
      await confirmPendingAnalytics(userB, pendingId);
    } catch {
      crossConfirmRejected = true;
    }
    findings.push({ check: "cross_user_confirm", ok: crossConfirmRejected });
    expect(crossConfirmRejected).toBe(true);

    // Wrong owner reject must fail / no-op as NOT_FOUND style
    let crossRejectRejected = false;
    try {
      await rejectPendingAnalytics(userB, pendingId);
    } catch {
      crossRejectRejected = true;
    }
    findings.push({ check: "cross_user_reject", ok: crossRejectRejected });
    expect(crossRejectRejected).toBe(true);

    // Anon JWT user B must not read user A pending rows via RLS
    const clientB = userClient(jwtB);
    const { data: leakedPending, error: pendingErr } = await clientB
      .from("analytics_pending_confirmations" as never)
      .select("*")
      .eq("id", pendingId);
    const pendingIsolated =
      !leakedPending ||
      (Array.isArray(leakedPending) && leakedPending.length === 0);
    findings.push({
      check: "rls_pending_isolation",
      ok: pendingIsolated,
      error: pendingErr?.message ?? null,
    });
    expect(pendingIsolated).toBe(true);

    // Owner can confirm
    await confirmPendingAnalytics(userA, pendingId);
    findings.push({ check: "owner_confirm", ok: true });

    // Hydration / physique / council tables — attempt forged reads
    const tables = ["chat_messages", "analytics_daily"] as const;
    for (const table of tables) {
      const { data, error } = await clientB
        .from(table as never)
        .select("*")
        .eq("user_id", userA)
        .limit(5);
      const isolated = !data || (Array.isArray(data) && data.length === 0);
      findings.push({
        check: `rls_${table}`,
        ok: isolated || Boolean(error),
        error: error?.message ?? null,
        rows: Array.isArray(data) ? data.length : null,
      });
    }

    // Client userId override attempt: user B JWT must not mutate as user A
    const { error: forgeErr } = await clientB.from("analytics_daily" as never).upsert({
      user_id: userA,
      entry_date: new Date().toISOString().slice(0, 10),
      water_ml: 99999,
    } as never);
    findings.push({
      check: "forged_userid_write",
      ok: Boolean(forgeErr),
      error: forgeErr?.message ?? null,
    });
    expect(forgeErr).toBeTruthy();

    const evidence = {
      capturedAt: new Date().toISOString(),
      liveDbCalls: true,
      userA,
      userB,
      findings,
    };
    const dir = join(process.cwd(), "kaios/live-evidence");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "supabase-multi-user.json"),
      JSON.stringify(evidence, null, 2),
    );
  }, 120_000);
});
