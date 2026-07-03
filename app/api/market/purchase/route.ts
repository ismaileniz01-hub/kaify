import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import { handleApiError, ok } from "@/lib/api/response";
import {
  applyMarketAura,
  purchaseMarketItem,
} from "@/lib/services/market.service";

export const dynamic = "force-dynamic";

const purchaseSchema = z.object({ itemId: z.string().min(1).max(32) });
const applySchema = z.object({ itemId: z.string().min(1).max(32) });

/** POST /api/market/purchase */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const idempotencyKey = getOptionalIdempotencyKey(request);
    const raw = await request.json().catch(() => null);
    const parsed = purchaseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz ürün.", parsed.error.issues);
    }
    const result = await withIdempotency({
      userId: user.id,
      endpoint: "POST /api/market/purchase",
      key: idempotencyKey,
      requestBody: parsed.data,
      handler: () => purchaseMarketItem(user.id, parsed.data.itemId),
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/market/purchase" });
  }
}

/** PATCH /api/market/purchase — apply owned aura */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const idempotencyKey = getOptionalIdempotencyKey(request);
    const raw = await request.json().catch(() => null);
    const parsed = applySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz aura.", parsed.error.issues);
    }
    const result = await withIdempotency({
      userId: user.id,
      endpoint: "PATCH /api/market/purchase",
      key: idempotencyKey,
      requestBody: parsed.data,
      handler: () => applyMarketAura(user.id, parsed.data.itemId),
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/market/purchase" });
  }
}
