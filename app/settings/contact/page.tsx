"use client";

import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import type { SupportTicketDTO } from "@/lib/services/support.service";

export default function ContactSupportPage() {
  const { t } = useLang();
  const [ticket, setTicket] = useState<SupportTicketDTO | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void apiGet<SupportTicketDTO>("/api/support")
      .then(setTicket)
      .catch(() => setError(t("support.error.load")));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await apiPost<SupportTicketDTO>("/api/support", {
        message: message.trim(),
      });
      setTicket(updated);
      setMessage("");
    } catch {
      setError(t("support.error.send"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="phone-shell analytics-gradient relative flex flex-col">
      <header className="flex items-center justify-between px-4 pb-2 pt-12">
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-medium text-white">{t("settings.contact")}</h1>
        <div className="h-9 w-9" />
      </header>

      <main className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6">
        <p className="text-xs text-zinc-500">{t("support.intro")}</p>

        <div className="flex-1 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
          {(ticket?.messages ?? []).map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.sender === "user"
                  ? "ml-auto bg-purple-600/80 text-white"
                  : "bg-white/10 text-zinc-200"
              }`}
            >
              {m.body}
            </div>
          ))}
          {!ticket?.messages.length && (
            <p className="py-8 text-center text-xs text-zinc-600">{t("support.empty")}</p>
          )}
        </div>

        {error && <p className="text-xs text-red-300">{error}</p>}

        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder={t("support.placeholder")}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-purple-500/40"
          />
          <button
            type="button"
            disabled={busy || !message.trim()}
            onClick={() => void send()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
