import { defineRouteRaw } from "@/lib/api/route-handler";
import { ApiError } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { nativeSessionEstablishSchema } from "@/lib/validations/auth-otp.schema";
import { issueNativeHandoffTicket } from "@/lib/auth/native-handoff-ticket";
import { isNativeWebViewRequest } from "@/lib/native/webview-request";

export const runtime = "nodejs";

/** POST /api/auth/session/native-ticket — mint a one-time WebView consume ticket. */
export const POST = defineRouteRaw(
  {
    route: "POST /api/auth/session/native-ticket",
    auth: "none",
    publicRateLimit: "otp_verify",
  },
  async ({ request }) => {
    if (!isNativeWebViewRequest(request)) {
      return fail(new ApiError("FORBIDDEN", "Native client required."));
    }
    const body = await request.json().catch(() => null);
    const parsed = nativeSessionEstablishSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        new ApiError("VALIDATION_ERROR", "Invalid session.", parsed.error.issues),
      );
    }
    const ticket = await issueNativeHandoffTicket(parsed.data);
    return ok({ ticket });
  },
);
