"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, Loader2, Send } from "lucide-react";
import { apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { InlineAlert } from "@/components/InlineAlert";

type BroadcastResult = {
  broadcastId: string;
  recipients: number;
  inserted: number;
};

export default function AdminNotificationsPage() {
  const { t } = useLang();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [broadcastId, setBroadcastId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim() || busy) return;
    if (!window.confirm(t("admin.notifications.confirm", { title: title.trim() }))) {
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiPost<BroadcastResult>("/api/admin/notifications/broadcast", {
        title: title.trim(),
        body: body.trim(),
        ...(broadcastId.trim() ? { broadcastId: broadcastId.trim() } : {}),
      });
      setResult(res);
    } catch {
      setError(t("admin.notifications.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pb-16 pt-14 text-white">
      <div className="mx-auto max-w-lg">
        <Link href="/admin" className="text-sm text-purple-400 hover:text-purple-300">
          ← {t("admin.hub.back")}
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 ring-1 ring-purple-400/30">
            <BellRing className="h-5 w-5 text-purple-300" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t("admin.notifications.title")}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">{t("admin.notifications.subtitle")}</p>
          </div>
        </div>

        <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">{t("admin.notifications.field_title")}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder={t("admin.notifications.field_title_ph")}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-400">{t("admin.notifications.field_body")}</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder={t("admin.notifications.field_body_ph")}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-400">{t("admin.notifications.field_id")}</span>
            <input
              type="text"
              value={broadcastId}
              onChange={(e) => setBroadcastId(e.target.value)}
              maxLength={64}
              placeholder={t("admin.notifications.field_id_ph")}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-zinc-600">{t("admin.notifications.field_id_hint")}</p>
          </label>

          {error && <InlineAlert variant="error" message={error} />}
          {result && (
            <InlineAlert
              variant="success"
              message={t("admin.notifications.success", {
                inserted: result.inserted,
                recipients: result.recipients,
                id: result.broadcastId,
              })}
            />
          )}

          <button
            type="button"
            disabled={busy || !title.trim() || !body.trim()}
            onClick={() => void handleSend()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("admin.notifications.send")}
          </button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-zinc-600">{t("admin.notifications.note")}</p>
      </div>
    </div>
  );
}
