"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, Gift, Loader2, MessageCircle, Send, Snowflake, User } from "lucide-react";
import { apiPost, ApiClientError } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { InlineAlert } from "@/components/InlineAlert";
import { AdminSupportPanel } from "@/components/admin/AdminSupportPanel";
import { normalizeUserId } from "@/lib/utils/user-id";

type Tab = "broadcast" | "single" | "gift" | "support";
type GiftKind = "gems" | "freezie";

type BroadcastResult = {
  broadcastId: string;
  recipients: number;
  inserted: number;
};

export default function AdminHubPage() {
  const { t } = useLang();
  const { profile } = useSession();
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
  const [giftKind, setGiftKind] = useState<GiftKind>("gems");
  const [giftAmount, setGiftAmount] = useState("");
  const [giftReason, setGiftReason] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftSuccess, setGiftSuccess] = useState(false);

  const tabs: { id: Tab; label: string; icon: typeof BellRing }[] = [
    { id: "broadcast", label: t("admin.tab.broadcast"), icon: BellRing },
    { id: "single", label: t("admin.tab.single"), icon: User },
    { id: "gift", label: t("admin.tab.gift"), icon: Gift },
    { id: "support", label: t("admin.tab.support"), icon: MessageCircle },
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
    const userId = normalizeUserId(singleUserId);
    if (!userId || !singleTitle.trim() || !singleBody.trim() || singleBusy) return;
    setSingleBusy(true);
    setSingleError(null);
    setSingleSuccess(false);
    try {
      await apiPost("/api/admin/notifications/send", {
        userId,
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
    const userId = normalizeUserId(giftUserId);
    const amount = Number(giftAmount);
    if (!userId || !Number.isFinite(amount) || amount < 1 || giftBusy) return;
    setGiftBusy(true);
    setGiftError(null);
    setGiftSuccess(false);
    try {
      await apiPost("/api/admin/gifts/send", {
        userId,
        rewardKind: giftKind,
        amount,
        ...(giftReason.trim() ? { reason: giftReason.trim() } : {}),
      });
      setGiftSuccess(true);
    } catch (err) {
      setGiftError(err instanceof ApiClientError ? err.message : t("admin.gift.error"));
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
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white focus:border-purple-500/50 focus:outline-none"
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
              disabled={
                singleBusy ||
                !normalizeUserId(singleUserId) ||
                !singleTitle.trim() ||
                !singleBody.trim()
              }
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
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={giftUserId}
                  onChange={(e) => setGiftUserId(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white focus:border-purple-500/50 focus:outline-none"
                />
                {profile?.id && (
                  <button
                    type="button"
                    onClick={() => setGiftUserId(profile.id)}
                    className="shrink-0 rounded-xl border border-purple-500/30 px-3 text-xs text-purple-300 hover:bg-purple-500/10"
                  >
                    {t("admin.gift.use_mine")}
                  </button>
                )}
              </div>
            </label>

            <div className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.gift.kind")}</span>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setGiftKind("gems")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition ${
                    giftKind === "gems"
                      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                      : "border-white/10 bg-black/20 text-zinc-400"
                  }`}
                >
                  <Gift className="h-3.5 w-3.5" />
                  {t("admin.gift.kind_gems")}
                </button>
                <button
                  type="button"
                  onClick={() => setGiftKind("freezie")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition ${
                    giftKind === "freezie"
                      ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                      : "border-white/10 bg-black/20 text-zinc-400"
                  }`}
                >
                  <Snowflake className="h-3.5 w-3.5" />
                  {t("admin.gift.kind_freezie")}
                </button>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.gift.amount")}</span>
              <input
                type="number"
                min={1}
                max={100000}
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">{t("admin.gift.reason")}</span>
              <input
                type="text"
                value={giftReason}
                onChange={(e) => setGiftReason(e.target.value)}
                maxLength={200}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-purple-500/50 focus:outline-none"
              />
            </label>

            {giftError && <InlineAlert variant="error" message={giftError} />}
            {giftSuccess && <InlineAlert variant="success" message={t("admin.gift.pending_success")} />}

            <button
              type="button"
              disabled={
                giftBusy ||
                !normalizeUserId(giftUserId) ||
                !giftAmount ||
                Number(giftAmount) < 1
              }
              onClick={() => void handleGift()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {giftBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              {t("admin.gift.send")}
            </button>
          </div>
        )}

        {tab === "support" && <AdminSupportPanel />}
      </div>
    </div>
  );
}
