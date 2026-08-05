"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MessageRow } from "@/components/messages/MessageRow";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { type ContactId } from "@/lib/contacts";
import { publicAssetUrl } from "@/lib/public-asset-url";
import { useKai } from "@/lib/kai-context";
import { useLang } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { apiGet } from "@/lib/api/client";
import { canUseTeamChat, isTeamChatPlan } from "@/lib/billing/team-chat-access";
import { errorToMessage } from "@/lib/i18n/api-error";
import type { InboxCoachDTO } from "@/lib/services/messages.service";
import { CONTACTS, CONTACT_LIST } from "@/lib/contacts";
import { AppHeader } from "@/components/navigation/AppHeader";

export default function MessagesPage() {
  const { t } = useLang();
  const { avatar: kaiAvatar } = useKai();
  const { isAuthenticated, profile } = useSession();
  const [inbox, setInbox] = useState<InboxCoachDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadInbox = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setLoadError(null);
    void apiGet<{ inbox: InboxCoachDTO[] }>("/api/messages")
      .then((res) => setInbox(res.inbox))
      .catch((err) => {
        setInbox(null);
        setLoadError(errorToMessage(err, t) || t("messages.error.load"));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadInbox();
  }, [isAuthenticated, loadInbox]);

  const rows =
    inbox ??
    (!isAuthenticated
      ? CONTACT_LIST.map((id) => {
          const c = CONTACTS[id];
          return {
            coachId: id,
            name: c.name,
            role: c.role,
            avatarUrl: c.avatar,
            preview: c.preview,
            time: c.time,
            unreadCount: c.badge ?? 0,
          };
        })
      : []);

  const planAllowsTeam = !isAuthenticated || isTeamChatPlan(profile?.tier);
  const teamUnlocked =
    !isAuthenticated ||
    canUseTeamChat({
      tier: profile?.tier,
      teamChatUnlocked: profile?.teamChatUnlocked,
    });

  return (
    <div className="phone-shell messages-gradient messages-pattern relative flex flex-col">
      <AppHeader
        backHref="/welcome"
        backLabel={t("nav.back")}
        title={t("nav.messages")}
        trailing={<span className="text-[11px] font-medium text-zinc-500">{t("messages.date")}</span>}
        divider
      />

      <main className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-8">
        {loadError && (
          <InlineAlert
            message={loadError}
            onRetry={loadInbox}
            retryLabel={t("common.retry")}
            dismissLabel={t("common.dismiss")}
            onDismiss={() => setLoadError(null)}
          />
        )}

        {isAuthenticated && inbox === null && !loadError && (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-2xl bg-white/5"
                aria-hidden
              />
            ))}
            <p className="sr-only">{t("common.loading")}</p>
          </div>
        )}

        {isAuthenticated && inbox !== null && rows.length === 0 && !loadError && (
          <EmptyState
            title={t("messages.empty.title")}
            subtitle={t("messages.empty.subtitle")}
            className="py-16"
          />
        )}

        {(!isAuthenticated || inbox !== null) &&
          !loading &&
          rows.map((row, i) => {
            const id = row.coachId as ContactId;
            const c = CONTACTS[id];
            return (
              <MessageRow
                key={id}
                index={i}
                name={row.name}
                role={row.role}
                preview={row.preview}
                time={row.time}
                href={`/chat/${id}`}
                avatarSrc={id === "kai" ? kaiAvatar : row.avatarUrl || c.avatar}
                badge={row.unreadCount > 0 ? row.unreadCount : undefined}
                color={c.color.primary}
              />
            );
          })}

        {planAllowsTeam && (
          <Link
            href={teamUnlocked ? "/chat/team" : "/streak"}
            className={`animate-in mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
              teamUnlocked
                ? "border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/15"
                : "border-zinc-700/50 bg-zinc-900/50 opacity-60"
            }`}
          >
            <div className="flex -space-x-2">
              {(["alex", "maya", "leo", "kai"] as ContactId[]).map((id) => (
                <div
                  key={id}
                  className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-zinc-900"
                >
                  <Image
                    src={id === "kai" ? publicAssetUrl(kaiAvatar) : publicAssetUrl(CONTACTS[id].avatar)}
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{t("messages.team_title")}</p>
              <p className="text-[11px] text-zinc-400">
                {teamUnlocked ? t("messages.team_sub") : t("messages.team_locked")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </Link>
        )}
      </main>
    </div>
  );
}
