import { ApiError } from "@/lib/api/errors";
import { defineDynamicRoute } from "@/lib/api/route-handler";
import { deleteChatMessage } from "@/lib/services/chat-message-delete.service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageIdSchema = z.string().uuid();

export const DELETE = defineDynamicRoute<{ messageId: string }>(
  { route: "DELETE /api/chat/messages/[messageId]" },
  async ({ user, params }) => {
    const parsed = messageIdSchema.safeParse(params.messageId);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz mesaj kimliği.", parsed.error.issues);
    }
    return deleteChatMessage({ userId: user.id, messageId: parsed.data });
  },
);
