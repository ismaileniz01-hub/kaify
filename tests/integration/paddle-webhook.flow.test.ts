import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const SECRET = "test-paddle-webhook-secret";

const insert = vi.fn();
const selectEqMaybeSingle = vi.fn();
const updateEq = vi.fn();
const deleteEqIs = vi.fn();
const rpc = vi.fn();

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
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "paddle_subscriptions") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
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
import { POST as paddleWebhookPost } from "@/app/api/webhooks/paddle/route";

function sign(rawBody: string, ts = Math.floor(Date.now() / 1000)): string {
  const h1 = createHmac("sha256", SECRET).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

function webhookRequest(rawBody: string, signature: string | null): NextRequest {
  return {
    method: "POST",
    text: async () => rawBody,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "paddle-signature" ? signature : null,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.stubEnv("PADDLE_NOTIFICATION_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("PADDLE_API_KEY", "");
  insert.mockReset();
  selectEqMaybeSingle.mockReset();
  updateEq.mockReset();
  deleteEqIs.mockReset();
  rpc.mockReset();
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
