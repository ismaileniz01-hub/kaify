import { ApiError } from "@/lib/api/errors";
import { defineDynamicRoute } from "@/lib/api/route-handler";
import { parseJsonWithLimit } from "@/lib/security/body-limit";
import { deleteChatMessage } from "@/lib/services/chat-message-delete.service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageIdSchema = z.string().uuid();
const extraIdsSchema = z.object({
  ids: z.array(z.string().uuid()).max(50).optional(),
});

export const DELETE = defineDynamicRoute<{ messageId: string }>(
  { route: "DELETE /api/chat/messages/[messageId]" },
  async ({ user, params, request }) => {
    const parsed = messageIdSchema.safeParse(params.messageId);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz mesaj kimliği.", parsed.error.issues);
    }

    let extraIds: string[] = [];
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 0) {
      const body = await parseJsonWithLimit(request, 16 * 1024);
      const extra = extraIdsSchema.safeParse(body);
      if (!extra.success) {
        throw new ApiError("VALIDATION_ERROR", "Geçersiz mesaj listesi.", extra.error.issues);
      }
      extraIds = extra.data.ids ?? [];
    }

    return deleteChatMessage({
      userId: user.id,
      messageId: parsed.data,
      extraIds,
    });
  },
);
