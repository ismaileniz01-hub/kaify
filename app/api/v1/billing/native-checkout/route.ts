import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import {
  getPaddleServerClient,
  isPaddleServerConfigured,
} from "@/lib/billing/paddle-server";
import { getPaddlePriceIdForPlan } from "@/lib/billing/paddle-config";
import { parseJsonWithLimit } from "@/lib/security/body-limit";

const requestSchema = z.object({
  planId: z.enum(["essential", "pro", "premium"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = defineRoute(
  {
    route: "POST /api/v1/billing/native-checkout",
    requireTermsConsent: true,
  },
  async ({ user, request }) => {
    const body = await parseJsonWithLimit(request, 8 * 1024);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz abonelik seçimi.",
        parsed.error.issues,
      );
    }
    if (!isPaddleServerConfigured()) {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "Ödeme hizmeti şu anda kullanılamıyor.",
      );
    }

    const priceId = getPaddlePriceIdForPlan(
      parsed.data.planId,
      parsed.data.interval,
    );
    if (!priceId) {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "Seçilen plan şu anda kullanılamıyor.",
      );
    }

    const transaction = await getPaddleServerClient().transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: {
        user_id: user.id,
        source: "native_checkout",
        plan_id: parsed.data.planId,
        interval: parsed.data.interval,
      },
    });
    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "Güvenli ödeme bağlantısı oluşturulamadı.",
      );
    }

    return { checkoutUrl };
  },
);
