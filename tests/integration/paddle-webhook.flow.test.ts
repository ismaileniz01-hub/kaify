import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SECRET = "test-paddle-webhook-secret";

const insert = vi.fn();
const selectEqMaybeSingle = vi.fn();
const updateEq = vi.fn();
const deleteEqIs = vi.fn();
const rpc = vi.fn();

const paddleSubSelect = vi.fn();
const supporterUpsert = vi.fn();
const supporterSelect = vi.fn();
const supporterUpdateEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "billing_events") {
        return {
          insert,
          select: () => ({
            eq: () => ({ maybeSingle: selectEqMaybeSingle }),
          }),
          update: () => ({ eq: updateEq }),
          delete: () => ({
            eq: () => ({ is: deleteEqIs }),
          }),
        };
      }
      if (table === "paddle_customers") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "paddle_subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: paddleSubSelect,
              in: () => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "supporter_purchases") {
        return {
          upsert: supporterUpsert,
          select: () => ({ eq: () => ({ maybeSingle: supporterSelect }) }),
          update: (values: unknown) => ({
            eq: (_col: string, id: string) => supporterUpdateEq(values, id),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "u1" },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
      };
    },
    rpc,
  }),
}));

vi.mock("@/lib/billing/paddle-server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/billing/paddle-server")>(
    "@/lib/billing/paddle-server",
  );
  return {
    ...actual,
    isPaddleServerConfigured: () => false,
    getPaddleWebhookSecret: () =>
      process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim() ?? "",
  };
});

import {
  handleNormalizedPaddleEvent,
  verifyAndParsePaddleWebhook,
} from "@/lib/services/billing.service";
import {
  POST as paddleWebhookPost,
} from "@/app/api/webhooks/paddle/route";
import { PADDLE_WEBHOOK_MAX_BYTES } from "@/lib/api/request-body-limit";

function sign(rawBody: string, ts = Math.floor(Date.now() / 1000)): string {
  const h1 = createHmac("sha256", SECRET).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

function webhookRequest(rawBody: string, signature: string | null): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/paddle", {
    method: "POST",
    headers: {
      ...(signature ? { "paddle-signature": signature } : {}),
      "content-type": "application/json",
    },
    body: rawBody,
  });
}

beforeEach(() => {
  vi.stubEnv("PADDLE_NOTIFICATION_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("PADDLE_API_KEY", "");
  insert.mockReset();
  selectEqMaybeSingle.mockReset();
  updateEq.mockReset();
  deleteEqIs.mockReset();
  deleteEqIs.mockResolvedValue({ error: null });
  rpc.mockReset();
  paddleSubSelect.mockReset();
  paddleSubSelect.mockResolvedValue({ data: null, error: null });
  supporterUpsert.mockReset();
  supporterUpsert.mockResolvedValue({ error: null });
  supporterSelect.mockReset();
  supporterSelect.mockResolvedValue({ data: null, error: null });
  supporterUpdateEq.mockReset();
  supporterUpdateEq.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyAndParsePaddleWebhook", () => {
  it("throws webhook_not_configured when secret missing", async () => {
    vi.stubEnv("PADDLE_NOTIFICATION_WEBHOOK_SECRET", "");
    await expect(verifyAndParsePaddleWebhook("{}", "ts=1;h1=abc")).rejects.toThrow(
      "webhook_not_configured",
    );
  });

  it("throws invalid_signature for bad HMAC", async () => {
    await expect(
      verifyAndParsePaddleWebhook('{"event_id":"e1","data":{}}', "ts=1;h1=deadbeef"),
    ).rejects.toThrow("invalid_signature");
  });

  it("parses a valid HMAC-signed payload (API-key-less fallback)", async () => {
    const raw = JSON.stringify({
      event_id: "evt_ok_1",
      event_type: "subscription.updated",
      data: { id: "sub_1", customer_id: "ctm_1", status: "active" },
    });
    const event = await verifyAndParsePaddleWebhook(raw, sign(raw));
    expect(event.eventId).toBe("evt_ok_1");
    expect(event.eventType).toBe("subscription.updated");
    expect(event.data.id).toBe("sub_1");
  });

  it("throws missing_event_id when event_id absent", async () => {
    const raw = JSON.stringify({ event_type: "x", data: {} });
    await expect(verifyAndParsePaddleWebhook(raw, sign(raw))).rejects.toThrow(
      "missing_event_id",
    );
  });
});

describe("handleNormalizedPaddleEvent claims", () => {
  it("returns skipped when event already finalized", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate" } });
    selectEqMaybeSingle.mockResolvedValue({
      data: { processed_at: "2026-08-01T00:00:00Z" },
      error: null,
    });

    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_done",
      eventType: "subscription.updated",
      data: { id: "sub_1", custom_data: { user_id: "u1" } },
      rawPayload: {},
    });

    expect(result).toEqual({ ok: true, skipped: true });
  });

  it("returns retryable claim_in_progress when another worker holds the claim", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate" } });
    selectEqMaybeSingle.mockResolvedValue({
      data: { processed_at: null },
      error: null,
    });

    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_busy",
      eventType: "subscription.updated",
      data: { id: "sub_1", custom_data: { user_id: "u1" } },
      rawPayload: {},
    });

    expect(result).toEqual({
      ok: false,
      reason: "claim_in_progress",
      retryable: true,
    });
  });

  it("returns missing_data when payload data is empty", async () => {
    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_empty",
      eventType: "subscription.updated",
      data: {},
      rawPayload: {},
    });
    expect(result).toEqual({ ok: false, reason: "missing_data" });
  });
});

describe("POST /api/webhooks/paddle", () => {
  it("rejects an oversized body before signature verification", async () => {
    const raw = "x".repeat(PADDLE_WEBHOOK_MAX_BYTES + 1);
    const res = await paddleWebhookPost(webhookRequest(raw, sign(raw)));

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({
      error: "payload_too_large",
    });
  });

  it("returns 401 for invalid signature", async () => {
    const res = await paddleWebhookPost(
      webhookRequest('{"event_id":"e","data":{}}', "ts=1;h1=00"),
    );
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "invalid_signature" });
  });

  it("returns 503 when webhook secret is not configured", async () => {
    vi.stubEnv("PADDLE_NOTIFICATION_WEBHOOK_SECRET", "");
    const res = await paddleWebhookPost(webhookRequest("{}", "ts=1;h1=00"));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: "webhook_not_configured",
    });
  });

  it("returns 503 retryable when claim is in progress", async () => {
    const raw = JSON.stringify({
      event_id: "evt_route_busy",
      event_type: "subscription.updated",
      data: { id: "sub_1", custom_data: { user_id: "u1" } },
    });
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate" } });
    selectEqMaybeSingle.mockResolvedValue({
      data: { processed_at: null },
      error: null,
    });

    const res = await paddleWebhookPost(webhookRequest(raw, sign(raw)));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: "claim_in_progress",
    });
  });

  it("returns 200 skipped for already-processed events", async () => {
    const raw = JSON.stringify({
      event_id: "evt_route_done",
      event_type: "subscription.updated",
      data: { id: "sub_1", custom_data: { user_id: "u1" } },
    });
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate" } });
    selectEqMaybeSingle.mockResolvedValue({
      data: { processed_at: "2026-08-01T00:00:00Z" },
      error: null,
    });

    const res = await paddleWebhookPost(webhookRequest(raw, sign(raw)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      received: true,
      skipped: true,
    });
  });
});

describe("stale Paddle subscription events", () => {
  it("does not apply an older updated after a newer cancel", async () => {
    insert.mockResolvedValue({ error: null });
    paddleSubSelect.mockResolvedValue({
      data: {
        last_event_occurred_at: "2026-08-01T12:00:00.000Z",
        last_event_id: "evt_cancel",
        last_event_rank: 3,
      },
      error: null,
    });
    updateEq.mockResolvedValue({ error: null });

    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_old_update",
      eventType: "subscription.updated",
      occurredAt: "2026-08-01T11:00:00.000Z",
      data: {
        id: "sub_1",
        custom_data: { user_id: "u1" },
        status: "active",
      },
      rawPayload: {},
    });

    expect(result).toEqual({ ok: true, skipped: true });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("Paddle refund and dispute entitlement", () => {
  it("revokes access for an approved full refund", async () => {
    insert.mockResolvedValue({ error: null });
    updateEq.mockResolvedValue({ error: null });

    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_refund_full",
      eventType: "adjustment.updated",
      data: {
        id: "adj_1",
        action: "refund",
        type: "full",
        status: "approved",
        custom_data: { user_id: "u1" },
      },
      rawPayload: {},
    });

    expect(result).toEqual({ ok: true });
  });

  it("does not revoke access for an approved partial refund", async () => {
    insert.mockResolvedValue({ error: null });
    updateEq.mockResolvedValue({ error: null });

    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_refund_partial",
      eventType: "adjustment.updated",
      data: {
        id: "adj_2",
        action: "refund",
        type: "partial",
        status: "approved",
        custom_data: { user_id: "u1" },
      },
      rawPayload: {},
    });

    expect(result).toEqual({ ok: true });
  });

  it("revokes access when a dispute is lost", async () => {
    insert.mockResolvedValue({ error: null });
    updateEq.mockResolvedValue({ error: null });

    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_dispute_lost",
      eventType: "dispute.updated",
      data: {
        id: "dsp_1",
        status: "closed",
        outcome: "lost",
        custom_data: { user_id: "u1" },
      },
      rawPayload: {},
    });

    expect(result).toEqual({ ok: true });
  });
});

describe("supporter pack (guest checkout)", () => {
  const SUPPORTER_PRICE = "pri_01m7ttwghve8z5ds38p465k676";

  it("records a guest purchase without a user and never provisions a tier", async () => {
    insert.mockResolvedValue({ error: null });
    updateEq.mockResolvedValue({ error: null });

    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_supporter_guest",
      eventType: "transaction.completed",
      data: {
        id: "txn_guest_1",
        customer_id: "ctm_guest",
        currency_code: "EUR",
        items: [{ price: { id: SUPPORTER_PRICE } }],
        details: { totals: { grand_total: "250000" } },
        custom_data: { kind: "supporter_pack" },
      },
      rawPayload: {},
    });

    expect(result).toEqual({ ok: true });
    expect(rpc).not.toHaveBeenCalled();
    expect(supporterUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_id: "txn_guest_1",
        user_id: null,
        customer_id: "ctm_guest",
        price_id: SUPPORTER_PRICE,
        amount_minor: 250000,
        currency_code: "EUR",
        status: "completed",
      }),
      { onConflict: "transaction_id", ignoreDuplicates: true },
    );
  });

  it("marks a refunded supporter transaction without revoking any subscription", async () => {
    insert.mockResolvedValue({ error: null });
    updateEq.mockResolvedValue({ error: null });
    supporterSelect.mockResolvedValue({
      data: { transaction_id: "txn_guest_1", status: "completed" },
      error: null,
    });

    const result = await handleNormalizedPaddleEvent({
      eventId: "evt_supporter_refund",
      eventType: "adjustment.updated",
      data: {
        id: "adj_1",
        transaction_id: "txn_guest_1",
        action: "refund",
        type: "full",
        status: "approved",
      },
      rawPayload: {},
    });

    expect(result).toEqual({ ok: true });
    expect(rpc).not.toHaveBeenCalled();
    expect(supporterUpdateEq).toHaveBeenCalledWith(
      expect.objectContaining({ status: "refunded" }),
      "txn_guest_1",
    );
  });
});
