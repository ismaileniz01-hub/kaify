"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import type { UserSettingsDTO } from "@/lib/services/settings.service";

const CAPS = [2, 4, 8, 12, 24];

export function NotificationScheduleSection() {
  const { t } = useLang();
  const [cap, setCap] = useState(8);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiGet<UserSettingsDTO>("/api/settings")
      .then((settings) => {
        setCap(settings.dailyPushCap);
      })
      .catch(() => undefined);
  }, []);

  const persist = async (patch: Partial<UserSettingsDTO>) => {
    setBusy(true);
    try {
      const next = await apiPatch<UserSettingsDTO>("/api/settings", patch);
      setCap(next.dailyPushCap);
    } catch {
      // Keep last known values; save error is shown by the parent settings page.
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {t("settings.daily_push_cap")}
      </h2>
      <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Bell className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{t("settings.daily_push_cap")}</p>
            <p className="text-[11px] leading-snug text-zinc-500">{t("settings.daily_push_cap.desc")}</p>
          </div>
        </div>
        <label className="block">
          <select
            disabled={busy}
            aria-label={t("settings.daily_push_cap")}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"
            value={cap}
            onChange={(event) => {
              const next = Number(event.target.value);
              setCap(next);
              void persist({ dailyPushCap: next });
            }}
          >
            {CAPS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
