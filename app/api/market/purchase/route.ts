import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { defineRoute } from "@/lib/api/route-handler";
import {
  applyMarketAura,
  purchaseMarketItem,
} from "@/lib/services/market.service";

export const dynamic = "force-dynamic";

const purchaseSchema = z.object({ itemId: z.string().min(1).max(32) });
const applySchema = z.object({ itemId: z.string().min(1).max(32) });

/** POST /api/market/purchase */
export const POST = defineRoute(
  { route: "POST /api/market/purchase", requireCsrf: true },
  async ({ user, request }) => {
    const idempotencyKey = getOptionalIdempotencyKey(request);
    const raw = await request.json().catch(() => null);
    const parsed = purchaseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz ürün.", parsed.error.issues);
    }
    return withIdempotency({
      userId: user.id,
      endpoint: "POST /api/market/purchase",
      key: idempotencyKey,
      requestBody: parsed.data,
      handler: () => purchaseMarketItem(user.id, parsed.data.itemId),
    });
  },
);

/** PATCH /api/market/purchase — apply owned aura */
export const PATCH = defineRoute(
  { route: "PATCH /api/market/purchase" },
  async ({ user, request }) => {
    const idempotencyKey = getOptionalIdempotencyKey(request);
    const raw = await request.json().catch(() => null);
    const parsed = applySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz aura.", parsed.error.issues);
    }
    return withIdempotency({
      userId: user.id,
      endpoint: "PATCH /api/market/purchase",
      key: idempotencyKey,
      requestBody: parsed.data,
      handler: () => applyMarketAura(user.id, parsed.data.itemId),
    });
  },
);
