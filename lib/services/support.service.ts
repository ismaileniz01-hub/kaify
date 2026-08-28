import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { mapProfileRow, type ProfileDTO } from "@/lib/types/domain.types";
import { createNotification } from "@/lib/services/notifications.service";

export type SupportTicketDTO = {
  id: string;
  subject: string;
  status: "open" | "closed";
  updatedAt: string;
  messages: SupportMessageDTO[];
};

export type SupportMessageDTO = {
  id: string;
  sender: "user" | "admin";
  body: string;
  createdAt: string;
};

function supportDb() {
  return createAdminSupabaseClient();
}

async function listTicketMessages(ticketId: string): Promise<SupportMessageDTO[]> {
  const admin = supportDb();
  const { data, error } = await admin
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("[support] load messages failed", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Destek mesajları yüklenemedi.");
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    createdAt: m.created_at,
  }));
}

function toTicketDto(
  row: {
    id: string;
    subject: string;
    status: string;
    updated_at: string;
  },
  messages: SupportMessageDTO[],
): SupportTicketDTO {
  return {
    id: row.id,
    subject: row.subject,
    status: row.status === "closed" ? "closed" : "open",
    updatedAt: row.updated_at,
    messages,
  };
}

/** Read-only: opening Settings → Contact must not create an empty hub ticket. */
export async function getUserSupportTicket(userId: string): Promise<SupportTicketDTO> {
  const admin = supportDb();
  const { data: rows, error: listError } = await admin
    .from("support_tickets")
    .select("id, subject, status, updated_at")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (listError) {
    logger.error("[support] load user ticket failed", { error: listError.message });
    throw new ApiError("INTERNAL_ERROR", "Destek talebi yüklenemedi.");
  }

  const existing = rows?.[0];
  if (!existing) {
    return {
      id: "",
      subject: "Support request",
      status: "open",
      updatedAt: new Date(0).toISOString(),
      messages: [],
    };
  }

  return toTicketDto(existing, await listTicketMessages(existing.id));
}

export async function getOrCreateUserTicket(userId: string): Promise<SupportTicketDTO> {
  const existing = await getUserSupportTicket(userId);
  if (existing.id) return existing;

  const admin = supportDb();
  const { data: created, error } = await admin
    .from("support_tickets")
    .insert({ user_id: userId, subject: "Support request" })
    .select("id, subject, status, updated_at")
    .single();
  if (error || !created) {
    logger.error("[support] create ticket failed", { error: error?.message });
    throw new ApiError("INTERNAL_ERROR", "Destek talebi oluşturulamadı.");
  }
  return toTicketDto(created, []);
}

export async function sendUserSupportMessage(
  userId: string,
  body: string,
): Promise<SupportTicketDTO> {
  const trimmed = body.trim();
  if (!trimmed) throw new ApiError("VALIDATION_ERROR", "Mesaj boş olamaz.");

  const admin = supportDb();
  const ticket = await getOrCreateUserTicket(userId);

  const { error } = await admin.from("support_messages").insert({
    ticket_id: ticket.id,
    sender: "user",
    body: trimmed,
  });
  if (error) {
    logger.error("[support] send user message failed", { error: error.message });
    throw new ApiError("INTERNAL_ERROR", "Mesaj gönderilemedi.");
  }

  await admin
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticket.id);

  return getOrCreateUserTicket(userId);
}

export type AdminSupportTicketSummary = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  subject: string;
  status: string;
  updatedAt: string;
  lastMessage: string;
};

export async function listAdminSupportTickets(): Promise<AdminSupportTicketSummary[]> {
  const admin = supportDb();
  const { data: tickets, error: ticketsError } = await admin
    .from("support_tickets")
    .select("id, user_id, subject, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (ticketsError) {
    logger.error("[support] list tickets failed", { error: ticketsError.message });
    throw new ApiError("INTERNAL_ERROR", "Destek kutusu yüklenemedi.");
  }

  const list = tickets ?? [];
  if (list.length === 0) return [];

  const userIds = [...new Set(list.map((t) => t.user_id))];
  const ticketIds = list.map((t) => t.id);

  const [{ data: profiles, error: profilesError }, { data: messages, error: messagesError }] =
    await Promise.all([
      admin.from("profiles").select("id, display_name").in("id", userIds),
      admin
        .from("support_messages")
        .select("ticket_id, body, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false }),
    ]);

  if (messagesError) {
    logger.error("[support] list last messages failed", {
      error: messagesError.message,
    });
    throw new ApiError("INTERNAL_ERROR", "Destek kutusu yüklenemedi.");
  }
  if (profilesError) {
    logger.warn("[support] list profiles failed", { error: profilesError.message });
  }

  const nameByUser = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameByUser.set(p.id, p.display_name?.trim() || "User");
  }

  const lastBodyByTicket = new Map<string, string>();
  for (const m of messages ?? []) {
    if (!lastBodyByTicket.has(m.ticket_id)) {
      lastBodyByTicket.set(m.ticket_id, m.body ?? "");
    }
  }

  return list
    .filter((t) => lastBodyByTicket.has(t.id))
    .map((t) => ({
      id: t.id,
      userId: t.user_id,
      userName: nameByUser.get(t.user_id) ?? "User",
      userEmail: null,
      subject: t.subject,
      status: t.status,
      updatedAt: t.updated_at,
      lastMessage: lastBodyByTicket.get(t.id) ?? "",
    }));
}

export async function getAdminSupportTicket(ticketId: string): Promise<{
  ticket: AdminSupportTicketSummary;
  messages: SupportMessageDTO[];
  profile: ProfileDTO | null;
}> {
  const admin = supportDb();
  const { data: t } = await admin
    .from("support_tickets")
    .select("id, user_id, subject, status, updated_at")
    .eq("id", ticketId)
    .maybeSingle();

  if (!t) throw new ApiError("NOT_FOUND", "Talep bulunamadı.");

  const [{ data: profile }, email] = await Promise.all([
    admin.from("profiles").select("*").eq("id", t.user_id).maybeSingle(),
    admin.auth.admin
      .getUserById(t.user_id)
      .then((res) => res.data.user?.email ?? null)
      .catch(() => null),
  ]);

  const dto = profile ? mapProfileRow(profile) : null;
  const messages = await listTicketMessages(ticketId);

  return {
    ticket: {
      id: t.id,
      userId: t.user_id,
      userName: dto?.displayName ?? "User",
      userEmail: email,
      subject: t.subject,
      status: t.status,
      updatedAt: t.updated_at,
      lastMessage: messages.at(-1)?.body ?? "",
    },
    messages,
    profile: dto,
  };
}

export async function sendAdminSupportReply(
  ticketId: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new ApiError("VALIDATION_ERROR", "Mesaj boş olamaz.");

  const admin = supportDb();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("user_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) throw new ApiError("NOT_FOUND", "Talep bulunamadı.");

  const { error } = await admin.from("support_messages").insert({
    ticket_id: ticketId,
    sender: "admin",
    body: trimmed,
  });
  if (error) throw new ApiError("INTERNAL_ERROR", "Yanıt gönderilemedi.");

  await admin
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString(), status: "open" })
    .eq("id", ticketId);

  const preview =
    trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;

  await createNotification({
    userId: ticket.user_id,
    type: "system",
    titleKey: "notif.support_reply.title",
    bodyKey: "notif.support_reply.body",
    params: { preview },
    dedupKey: `support_reply:${ticketId}:${Date.now()}`,
  });
}
