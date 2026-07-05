"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { apiPost } from "@/lib/api/client";
import { CONSENT_TYPES } from "@/lib/legal/constants";
import {
  ensurePushReady,
  getPushPermission,
  hasActiveSubscription,
  isPushAvailable,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/unified";

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "busy";

/**
 * In-panel banner to enable/disable phone push notifications. Hidden entirely on
 * unsupported browsers. Requires explicit push consent before subscribing.
 */
export function PushToggle() {
  const { t } = useLang();
  const [state, setState] = useState<State>("loading");
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!(await isPushAvailable())) {
        if (active) setState("unsupported");
        return;
      }
      await ensurePushReady();
      const permission = await getPushPermission();
      const subscribed = await hasActiveSubscription();
      try {
        const status = await fetch("/api/consent", { credentials: "include" }).then((r) =>
          r.json(),
        );
        if (active && status.success) {
          setHasConsent(Boolean(status.data?.pushNotifications));
        }
      } catch {
        // ignore
      }
      if (!active) return;
      if (permission === "denied") setState("denied");
      else setState(subscribed && permission === "granted" ? "on" : "off");
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading" || state === "unsupported") return null;

  async function enable() {
    if (!consentChecked && !hasConsent) return;
    setState("busy");
    try {
      if (!hasConsent) {
        await apiPost("/api/consent", {
          consentType: CONSENT_TYPES.PUSH_NOTIFICATIONS,
        });
        setHasConsent(true);
      }
      const result = await subscribeToPush();
      if (result.ok) setState("on");
      else if (result.reason === "denied") setState("denied");
      else setState("off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    await unsubscribeFromPush();
    setState("off");
  }

  const accent = state === "on" ? "#22c55e" : "#a855f7";

  return (
    <div className="px-4 pb-1 pt-2">
      <div
        className="flex items-center gap-3 rounded-xl border-2 px-3.5 py-3"
        style={{
          borderColor:
            state === "on" ? "rgba(34,197,94,0.35)" : "rgba(168,85,247,0.35)",
          background:
            state === "on" ? "rgba(34,197,94,0.07)" : "rgba(168,85,247,0.07)",
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${accent}26`, boxShadow: `0 0 8px ${accent}40` }}
        >
          {state === "on" ? (
            <BellRing className="h-5 w-5" strokeWidth={2} style={{ color: accent }} />
          ) : (
            <BellOff className="h-5 w-5" strokeWidth={2} style={{ color: accent }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {state === "on"
              ? t("notif.push.enabled_title")
              : t("notif.push.enable_title")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {state === "denied"
              ? t("notif.push.denied")
              : state === "on"
                ? t("notif.push.enabled_desc")
                : t("notif.push.enable_desc")}
          </p>
          {state === "off" && !hasConsent && (
            <label className="mt-2 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 rounded border-white/20"
              />
              <span className="text-[11px] leading-snug text-zinc-400">
                {t("notif.push.consent_checkbox")}
              </span>
            </label>
          )}
        </div>

        {state !== "denied" && (
          <button
            type="button"
            onClick={() => (state === "on" ? void disable() : void enable())}
            disabled={state === "busy" || (state === "off" && !hasConsent && !consentChecked)}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white ring-1 transition hover:brightness-110 active:scale-95 disabled:opacity-60"
            style={{
              background: `${accent}26`,
              boxShadow: `inset 0 0 0 1px ${accent}55`,
            }}
          >
            {state === "busy" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {state === "on"
              ? t("notif.push.disable_button")
              : t("notif.push.enable_button")}
          </button>
        )}
      </div>
    </div>
  );
}
