import { ok } from "@/lib/api/response";
import { defineRoute } from "@/lib/api/route-handler";
import { getClientIP } from "@/lib/api-security";
import { ApiError } from "@/lib/api/errors";
import { getOptionalIdempotencyKey } from "@/lib/api/idempotency";
import { withIdempotency } from "@/lib/api/idempotency-store";
import {
  getConsentStatus,
  isRevocableConsentType,
  recordConsent,
  revokeConsent,
} from "@/lib/services/consent.service";
import {
  recordConsentSchema,
  revokeConsentSchema,
} from "@/lib/validations/consent.schema";

export const dynamic = "force-dynamic";

/** GET /api/consent — current user's consent flags. */
export const GET = defineRoute(
  { route: "GET /api/consent" },
  async ({ user }) => getConsentStatus(user.id),
);

/** POST /api/consent — record explicit consent (clickwrap / modal). */
export const POST = defineRoute(
  { route: "POST /api/consent" },
  async ({ user, request }) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz JSON gövdesi.");
    }

    const parsed = recordConsentSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz onay verisi.",
        parsed.error.issues,
      );
    }

    await withIdempotency({
      userId: user.id,
      endpoint: "POST /api/consent",
      key: getOptionalIdempotencyKey(request),
      requestBody: parsed.data,
      handler: async () => {
        await recordConsent({
          userId: user.id,
          consentType: parsed.data.consentType,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get("user-agent"),
          metadata: parsed.data.metadata,
        });
        return { recorded: true };
      },
    });

    return ok({ recorded: true });
  },
);

/** DELETE /api/consent — withdraw AI / photo consent (GDPR Art. 7(3)). */
export const DELETE = defineRoute(
  { route: "DELETE /api/consent" },
  async ({ user, request }) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz JSON gövdesi.");
    }

    const parsed = revokeConsentSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz geri çekme verisi.",
        parsed.error.issues,
      );
    }

    if (!isRevocableConsentType(parsed.data.consentType)) {
      throw new ApiError("VALIDATION_ERROR", "Bu onay türü geri çekilemez.");
    }

    await withIdempotency({
      userId: user.id,
      endpoint: "DELETE /api/consent",
      key: getOptionalIdempotencyKey(request),
      requestBody: parsed.data,
      handler: async () => {
        await revokeConsent({
          userId: user.id,
          consentType: parsed.data.consentType,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get("user-agent"),
        });
        return { revoked: true };
      },
    });

    return ok({ revoked: true });
  },
);
