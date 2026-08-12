/**
 * Seed controlled rows for high-risk user-owned tables used by RLS tests.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TestUser } from "./setup";

const today = () => new Date().toISOString().slice(0, 10);

export type SeedIds = {
  notificationIds: Record<"USER_A" | "USER_B", string>;
  giftIds: Record<"USER_A" | "USER_B", string>;
  ticketIds: Record<"USER_A" | "USER_B", string>;
};

/** Insert one owned row per user for tables that are not auto-created on signup. */
export async function seedUserOwnedRows(
  admin: SupabaseClient,
  userA: TestUser,
  userB: TestUser,
): Promise<SeedIds> {
  const users = [userA, userB] as const;
  const notificationIds = {} as SeedIds["notificationIds"];
  const giftIds = {} as SeedIds["giftIds"];
  const ticketIds = {} as SeedIds["ticketIds"];

  for (const u of users) {
    const uid = u.user.id;
    const label = u.label;

    // settings (not created by handle_new_user)
    await must(
      admin.from("user_settings").upsert({
        user_id: uid,
        sound_effects: true,
      }),
      `user_settings ${label}`,
    );

    // usage
    await must(
      admin.from("user_usage_counters").upsert({ user_id: uid }),
      `user_usage_counters ${label}`,
    );
    await must(
      admin.from("usage_events").insert({
        user_id: uid,
        resource: "text_tokens",
        event_type: "LIMIT_80",
        usage_percent: 80,
        used: 80,
        limit_value: 100,
      }),
      `usage_events ${label}`,
    );

    // chat / memory
    await must(
      admin.from("chat_messages").insert({
        user_id: uid,
        thread_type: "direct",
        sender: "user",
        message_type: "text",
        content: `seed-${label}`,
      }),
      `chat_messages ${label}`,
    );
    await must(
      admin.from("coaching_memory").insert({
        user_id: uid,
        summary: `memory-${label}`,
        key_facts: {},
      }),
      `coaching_memory ${label}`,
    );

    // analytics / health
    await must(
      admin.from("analytics_daily").upsert({
        user_id: uid,
        entry_date: today(),
        steps: label === "USER_A" ? 1000 : 2000,
      }),
      `analytics_daily ${label}`,
    );
    await must(
      admin.from("health_steps").upsert(
        {
          user_id: uid,
          entry_date: today(),
          steps: label === "USER_A" ? 1111 : 2222,
          source: "manual",
        },
        { onConflict: "user_id,entry_date,source" },
      ),
      `health_steps ${label}`,
    );

    // market
    await must(
      admin.from("user_market_inventory").upsert({
        user_id: uid,
        item_id: "blue",
      }),
      `user_market_inventory ${label}`,
    );

    // notifications
    const notif = await mustData(
      admin
        .from("notifications")
        .insert({
          user_id: uid,
          type: "system",
          title: `n-${label}`,
          body: "seed",
          dedup_key: `seed-${label}-${Date.now()}`,
        })
        .select("id")
        .single(),
      `notifications ${label}`,
    );
    notificationIds[label] = notif.id as string;

    // push
    await must(
      admin.from("push_subscriptions").upsert(
        {
          user_id: uid,
          endpoint: `https://example.com/push/${label}/${uid}`,
          p256dh: "seed-p256dh",
          auth: "seed-auth",
        },
        { onConflict: "endpoint" },
      ),
      `push_subscriptions ${label}`,
    );
    await must(
      admin.from("native_push_tokens").upsert(
        {
          user_id: uid,
          platform: "android",
          token: `token-${label}-${uid}`,
        },
        { onConflict: "token" },
      ),
      `native_push_tokens ${label}`,
    );

    // claims
    await must(
      admin.from("daily_chest_claims").upsert({
        user_id: uid,
        utc_date: today(),
        reward_kind: "gems",
        reward_amount: 10,
        reward_rarity: "common",
        idempotency_key: `chest-${label}-${uid}`,
      }),
      `daily_chest_claims ${label}`,
    );
    await must(
      admin.from("streak_gem_claims").upsert({
        user_id: uid,
        claim_key: `milestone-${label}`,
        amount: 50,
      }),
      `streak_gem_claims ${label}`,
    );

    // compliance / billing mirrors
    await must(
      admin.from("consent_records").insert({
        user_id: uid,
        consent_type: "terms",
        policy_version: "test-1",
      }),
      `consent_records ${label}`,
    );
    await must(
      admin.from("consent_revocations").insert({
        user_id: uid,
        consent_type: "ai_health",
        policy_version: "test-1",
      }),
      `consent_revocations ${label}`,
    );
    await must(
      admin.from("data_export_logs").insert({
        user_id: uid,
        table_count: 1,
        row_count: 1,
      }),
      `data_export_logs ${label}`,
    );

    const custId = `ctm_seed_${label.toLowerCase()}_${uid.slice(0, 8)}`;
    await must(
      admin.from("paddle_customers").upsert({
        customer_id: custId,
        user_id: uid,
        email: u.email,
      }),
      `paddle_customers ${label}`,
    );
    await must(
      admin.from("paddle_subscriptions").upsert({
        subscription_id: `sub_seed_${label.toLowerCase()}_${uid.slice(0, 8)}`,
        customer_id: custId,
        user_id: uid,
        status: "active",
        price_id: "pri_test",
        product_id: "pro_test",
      }),
      `paddle_subscriptions ${label}`,
    );

    const gift = await mustData(
      admin
        .from("pending_gifts")
        .insert({
          user_id: uid,
          reward_kind: "gems",
          amount: 5,
          reason: `seed-${label}`,
        })
        .select("id")
        .single(),
      `pending_gifts ${label}`,
    );
    giftIds[label] = gift.id as string;

    const ticket = await mustData(
      admin
        .from("support_tickets")
        .insert({
          user_id: uid,
          subject: `seed-${label}`,
          status: "open",
        })
        .select("id")
        .single(),
      `support_tickets ${label}`,
    );
    ticketIds[label] = ticket.id as string;

    await must(
      admin.from("analytics_pending_confirmations").insert({
        user_id: uid,
        coach_id: "kai",
        source: "chat",
        payload: { seed: label },
        status: "pending",
      }),
      `analytics_pending_confirmations ${label}`,
    );

    await must(
      admin.from("team_meeting_weeks").upsert({
        user_id: uid,
        week_start: today(),
      }),
      `team_meeting_weeks ${label}`,
    );
  }

  // referrals: A referred B
  await must(
    admin.from("referrals").insert({
      referrer_id: userA.user.id,
      referred_id: userB.user.id,
      code: "SEEDCODE",
      discount_applied: true,
    }),
    "referrals",
  );
  const ref = await mustData(
    admin
      .from("referrals")
      .select("id")
      .eq("referrer_id", userA.user.id)
      .eq("referred_id", userB.user.id)
      .single(),
    "referrals select",
  );
  await must(
    admin.from("referral_events").insert({
      referral_id: ref.id as string,
      referrer_id: userA.user.id,
      referred_id: userB.user.id,
      event_type: "signup",
      metadata: { seed: true },
    }),
    "referral_events",
  );

  // service-only sample rows (for deny tests)
  await must(
    admin.from("cron_job_runs").upsert({
      job_name: "db-test-heartbeat",
      last_status: "ok",
      last_detail: { seed: true },
    }),
    "cron_job_runs",
  );
  await must(
    admin.from("idempotency_keys").insert({
      user_id: userA.user.id,
      endpoint: "/api/db-test",
      idempotency_key: `db-test-${Date.now()}`,
      request_hash: "seed",
      status: "completed",
    }),
    "idempotency_keys",
  );

  return { notificationIds, giftIds, ticketIds };
}

type SbResult = { error: { message: string } | null; data?: unknown };

async function must(resultPromise: PromiseLike<SbResult>, label: string): Promise<void> {
  const { error } = await resultPromise;
  if (error) throw new Error(`seed ${label}: ${error.message}`);
}

async function mustData<T extends Record<string, unknown>>(
  resultPromise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string,
): Promise<T> {
  const { data, error } = await resultPromise;
  if (error || !data) throw new Error(`seed ${label}: ${error?.message ?? "no data"}`);
  return data;
}
