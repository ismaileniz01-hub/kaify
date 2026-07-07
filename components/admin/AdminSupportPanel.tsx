"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import type {
  AdminSupportTicketSummary,
  SupportMessageDTO,
} from "@/lib/services/support.service";

export function AdminSupportPanel() {
  const { t } = useLang();
  const [tickets, setTickets] = useState<AdminSupportTicketSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageDTO[]>([]);
  const [detail, setDetail] = useState<AdminSupportTicketSummary | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(() => {
    setLoading(true);
    void apiGet<{ tickets: AdminSupportTicketSummary[] }>("/api/admin/support")
      .then((res) => setTickets(res.tickets))
      .finally(() => setLoading(false));
  }, []);

  const loadTicket = useCallback((ticketId: string) => {
    void apiGet<{
      ticket: AdminSupportTicketSummary;
      messages: SupportMessageDTO[];
    }>(`/api/admin/support?ticketId=${ticketId}`).then((res) => {
      setDetail(res.ticket);
      setMessages(res.messages);
      setSelectedId(ticketId);
    });
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const sendReply = async () => {
    if (!selectedId || !reply.trim() || busy) return;
    setBusy(true);
    try {
      const res = await apiPost<{
        ticket: AdminSupportTicketSummary;
        messages: SupportMessageDTO[];
      }>("/api/admin/support", { ticketId: selectedId, message: reply.trim() });
      setDetail(res.ticket);
      setMessages(res.messages);
      setReply("");
      loadList();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white">{t("admin.support.inbox")}</h3>
        {tickets.length === 0 ? (
          <p className="text-xs text-zinc-500">{t("admin.support.empty")}</p>
        ) : (
          tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => loadTicket(ticket.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                selectedId === ticket.id
                  ? "border-purple-500/40 bg-purple-500/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <p className="text-sm font-medium text-white">{ticket.userName}</p>
              <p className="truncate text-[10px] text-zinc-500">{ticket.userEmail ?? ticket.userId}</p>
              <p className="mt-1 truncate text-xs text-zinc-400">{ticket.lastMessage}</p>
            </button>
          ))
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {!detail ? (
          <p className="py-12 text-center text-xs text-zinc-500">{t("admin.support.select")}</p>
        ) : (
          <>
            <div className="mb-3 border-b border-white/10 pb-3">
              <p className="text-sm font-semibold text-white">{detail.userName}</p>
              <p className="text-[11px] text-zinc-500">{detail.userEmail}</p>
              <p className="mt-1 font-mono text-[10px] text-zinc-600">{detail.userId}</p>
            </div>
            <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-2.5 py-2 text-xs ${
                    m.sender === "admin" ? "bg-purple-500/20 text-purple-100" : "bg-white/10 text-zinc-200"
                  }`}
                >
                  {m.body}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t("admin.support.reply_placeholder")}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
              />
              <button
                type="button"
                disabled={busy || !reply.trim()}
                onClick={() => void sendReply()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-white disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
