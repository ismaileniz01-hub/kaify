import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { mapProfileRow, type ProfileDTO } from "@/lib/types/domain.types";

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
  return createAdminSupabaseClient() as SupabaseClient;
}

async function listTicketMessages(ticketId: string): Promise<SupportMessageDTO[]> {
  const admin = supportDb();
  const { data } = await admin
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((m) => ({
    id: m.id,
    sender: m.sender as "user" | "admin",
    body: m.body,
    createdAt: m.created_at,
  }));
}

export async function getOrCreateUserTicket(userId: string): Promise<SupportTicketDTO> {
  const admin = supportDb();
  const { data: existing } = await admin
    .from("support_tickets")
    .select("id, subject, status, updated_at")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const { data: created, error } = await admin
      .from("support_tickets")
      .insert({ user_id: userId, subject: "Support request" })
      .select("id, subject, status, updated_at")
      .single();
    if (error || !created) {
      throw new ApiError("INTERNAL_ERROR", "Destek talebi oluşturulamadı.");
    }
    return {
      id: created.id,
      subject: created.subject,
      status: created.status as "open" | "closed",
      updatedAt: created.updated_at,
      messages: [],
    };
  }

  const messages = await listTicketMessages(existing.id);
  return {
    id: existing.id,
    subject: existing.subject,
    status: existing.status as "open" | "closed",
    updatedAt: existing.updated_at,
    messages,
  };
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
  if (error) throw new ApiError("INTERNAL_ERROR", "Mesaj gönderilemedi.");

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
  const { data: tickets } = await admin
    .from("support_tickets")
    .select("id, user_id, subject, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  const summaries: AdminSupportTicketSummary[] = [];
  for (const t of tickets ?? []) {
    const [{ data: profile }, { data: authUser }, { data: lastMsg }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", t.user_id).maybeSingle(),
      admin.auth.admin.getUserById(t.user_id),
      admin
        .from("support_messages")
        .select("body")
        .eq("ticket_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const dto = profile ? mapProfileRow(profile) : null;
    summaries.push({
      id: t.id,
      userId: t.user_id,
      userName: dto?.displayName ?? "User",
      userEmail: authUser.user?.email ?? null,
      subject: t.subject,
      status: t.status,
      updatedAt: t.updated_at,
      lastMessage: lastMsg?.body ?? "",
    });
  }
  return summaries;
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

  const [{ data: profile }, { data: authUser }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", t.user_id).maybeSingle(),
    admin.auth.admin.getUserById(t.user_id),
  ]);

  const dto = profile ? mapProfileRow(profile) : null;
  const messages = await listTicketMessages(ticketId);

  return {
    ticket: {
      id: t.id,
      userId: t.user_id,
      userName: dto?.displayName ?? "User",
      userEmail: authUser.user?.email ?? null,
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
}
