import { NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { ApiError } from "@/lib/api/errors";
import { handleApiError, ok } from "@/lib/api/response";
import {
  getReferralSummary,
  trackReferral,
} from "@/lib/services/referral.service";
import { trackReferralSchema } from "@/lib/validations/referral.schema";

export const runtime = "nodejs";

/** GET /api/referral — the user's referral code + stats. */
export async function GET() {
  try {
    const user = await requireUser();
    const summary = await getReferralSummary(user.id);
    return ok(summary);
  } catch (error) {
    return handleApiError(error, { route: "/api/referral" });
  }
}

/** POST /api/referral — record a referral for the current user (post-signup). */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const body = await request.json().catch(() => null);
    const parsed = trackReferralSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz referans kodu.", parsed.error.issues);
    }

    const result = await trackReferral({
      referredId: user.id,
      code: parsed.data.code,
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error, { route: "/api/referral" });
  }
}
