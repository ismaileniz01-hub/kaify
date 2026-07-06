"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, Gift, Loader2, Send, User } from "lucide-react";
import { apiPost } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { InlineAlert } from "@/components/InlineAlert";

type Tab = "broadcast" | "single" | "gift";

type BroadcastResult = {
  broadcastId: string;
  recipients: number;
  inserted: number;
};

export default function AdminHubPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("broadcast");

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastId, setBroadcastId] = useState("");
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);

  const [singleUserId, setSingleUserId] = useState("");
  const [singleTitle, setSingleTitle] = useState("");
  const [singleBody, setSingleBody] = useState("");
  const [singleBusy, setSingleBusy] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleSuccess, setSingleSuccess] = useState(false);

  const [giftUserId, setGiftUserId] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const [giftReason, setGiftReason] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftResult, setGiftResult] = useState<{ amount: number; balance: number } | null>(null);

  const tabs: { id: Tab; label: string; icon: typeof BellRing }[] = [
    { id: "broadcast", label: t("admin.tab.broadcast"), icon: BellRing },
    { id: "single", label: t("admin.tab.single"), icon: User },
    { id: "gift", label: t("admin.tab.gift"), icon: Gift },
  ];

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim() || broadcastBusy) return;
    if (!window.confirm(t("admin.notifications.confirm", { title: broadcastTitle.trim() }))) {
      return;
    }
    setBroadcastBusy(true);
    setBroadcastError(null);
    setBroadcastResult(null);
    try {
      const res = await apiPost<BroadcastResult>("/api/admin/notifications/broadcast", {
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        ...(broadcastId.trim() ? { broadcastId: broadcastId.trim() } : {}),
      });
      setBroadcastResult(res);
    } catch {
      setBroadcastError(t("admin.notifications.error"));
    } finally {
      setBroadcastBusy(false);
    }
  };

  const handleSingle = async () => {
    if (!singleUserId.trim() || !singleTitle.trim() || !singleBody.trim() || singleBusy) return;
    setSingleBusy(true);
    setSingleError(null);
    setSingleSuccess(false);
    try {
      await apiPost("/api/admin/notifications/send", {
        userId: singleUserId.trim(),
        title: singleTitle.trim(),
        body: singleBody.trim(),
      });
      setSingleSuccess(true);
    } catch {
      setSingleError(t("admin.single.error"));
    } finally {
      setSingleBusy(false);
    }
  };

  const handleGift = async () => {
    const amount = Number(giftAmount);
    if (!giftUserId.trim() || !Number.isFinite(amount) || amount < 1 || giftBusy) return;
    setGiftBusy(true);
    setGiftError(null);
    setGiftResult(null);
    try {
      const res = await apiPost<{ amount: number; balance: number }>("/api/admin/gems/grant", {
        userId: giftUserId.trim(),
        amount,
        ...(giftReason.trim() ? { reason: giftReason.trim() } : {}),
      });
      setGiftResult(res);
    } catch {
      setGiftError(t("admin.gift.error"));
    } finally {
      setGiftBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pb-16 pt-14 text-white">
      <div className="mx-auto max-w-lg">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("admin.hub.title")}</h1>
            <p className="mt-1 text-sm text-zinc-500">{t("admin.hub.ops_subtitle")}</p>
          </div>
          <Link href="/settings" className="text-sm text-purple-400 hover:text-purple-300">
            {t("admin.hub.back")}
          </Link>
        </header>

        <div className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition ${
                tab === id
                  ? "bg-purple-600 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {tab === "broadcast" && (
          <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-zinc-400">{t("admin.notifications.subtitle")}</p>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.notifications.field_title")}</span>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                maxLength={120}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.notifications.field_body")}</span>
              <textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                maxLength={500}
                rows={4}
                className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none"
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
            </label>

            {broadcastError && <InlineAlert variant="error" message={broadcastError} />}
            {broadcastResult && (
              <InlineAlert
                variant="success"
                message={t("admin.notifications.success", {
                  inserted: broadcastResult.inserted,
                  recipients: broadcastResult.recipients,
                  id: broadcastResult.broadcastId,
                })}
              />
            )}

            <button
              type="button"
              disabled={broadcastBusy || !broadcastTitle.trim() || !broadcastBody.trim()}
              onClick={() => void handleBroadcast()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {broadcastBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("admin.notifications.send")}
            </button>
          </div>
        )}

        {tab === "single" && (
          <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-zinc-400">{t("admin.single.subtitle")}</p>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.single.user_id")}</span>
              <input
                type="text"
                value={singleUserId}
                onChange={(e) => setSingleUserId(e.target.value)}
                placeholder={t("admin.single.user_id_ph")}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.notifications.field_title")}</span>
              <input
                type="text"
                value={singleTitle}
                onChange={(e) => setSingleTitle(e.target.value)}
                maxLength={120}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.notifications.field_body")}</span>
              <textarea
                value={singleBody}
                onChange={(e) => setSingleBody(e.target.value)}
                maxLength={500}
                rows={4}
                className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            {singleError && <InlineAlert variant="error" message={singleError} />}
            {singleSuccess && <InlineAlert variant="success" message={t("admin.single.success")} />}

            <button
              type="button"
              disabled={singleBusy || !singleUserId.trim() || !singleTitle.trim() || !singleBody.trim()}
              onClick={() => void handleSingle()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {singleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("admin.single.send")}
            </button>
          </div>
        )}

        {tab === "gift" && (
          <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-zinc-400">{t("admin.gift.subtitle")}</p>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.single.user_id")}</span>
              <input
                type="text"
                value={giftUserId}
                onChange={(e) => setGiftUserId(e.target.value)}
                placeholder={t("admin.single.user_id_ph")}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.gift.amount")}</span>
              <input
                type="number"
                min={1}
                max={100000}
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
                placeholder="100"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.gift.reason")}</span>
              <input
                type="text"
                value={giftReason}
                onChange={(e) => setGiftReason(e.target.value)}
                maxLength={200}
                placeholder={t("admin.gift.reason_ph")}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            {giftError && <InlineAlert variant="error" message={giftError} />}
            {giftResult && (
              <InlineAlert
                variant="success"
                message={t("admin.gift.success", {
                  amount: giftResult.amount,
                  balance: giftResult.balance,
                })}
              />
            )}

            <button
              type="button"
              disabled={giftBusy || !giftUserId.trim() || !giftAmount || Number(giftAmount) < 1}
              onClick={() => void handleGift()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {giftBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              {t("admin.gift.send")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
