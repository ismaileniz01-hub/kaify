import { defineRoute } from "@/lib/api/route-handler";
import { requireAdmin } from "@/lib/api/admin-guard";
import {
  getAdminSupportTicket,
  listAdminSupportTickets,
  sendAdminSupportReply,
} from "@/lib/services/support.service";

export const dynamic = "force-dynamic";

export const GET = defineRoute(
  { route: "GET /api/admin/support", auth: "user" },
  async ({ request }) => {
    await requireAdmin();
    const ticketId = new URL(request.url).searchParams.get("ticketId");
    if (ticketId) {
      return getAdminSupportTicket(ticketId);
    }
    return { tickets: await listAdminSupportTickets() };
  },
);

export const POST = defineRoute(
  { route: "POST /api/admin/support", auth: "user" },
  async ({ request }) => {
    await requireAdmin();
    const raw = (await request.json().catch(() => null)) as {
      ticketId?: string;
      message?: string;
    } | null;
    const ticketId = typeof raw?.ticketId === "string" ? raw.ticketId : "";
    const message = typeof raw?.message === "string" ? raw.message : "";
    await sendAdminSupportReply(ticketId, message);
    return getAdminSupportTicket(ticketId);
  },
);
