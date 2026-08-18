import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { parseJsonWithLimit } from "@/lib/security/body-limit";
import { deleteChatMessages } from "@/lib/services/chat-message-delete.service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export const POST = defineRoute(
  { route: "POST /api/chat/messages/delete" },
  async ({ user, request }) => {
    const body = await parseJsonWithLimit(request, 16 * 1024);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Geçersiz mesaj listesi.", parsed.error.issues);
    }
    return deleteChatMessages({
      userId: user.id,
      messageIds: parsed.data.ids,
    });
  },
);
