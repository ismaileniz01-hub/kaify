"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api/client";
import { useLang } from "@/lib/lang-context";
import type { UserSettingsDTO } from "@/lib/services/settings.service";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const CAPS = [2, 4, 8, 12, 24];

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function NotificationScheduleSection() {
  const { t } = useLang();
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [cap, setCap] = useState(8);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiGet<UserSettingsDTO>("/api/settings")
      .then((settings) => {
        setStart(settings.quietHoursStart);
        setEnd(settings.quietHoursEnd);
        setCap(settings.dailyPushCap);
      })
      .catch(() => undefined);
  }, []);

  const persist = async (patch: Partial<UserSettingsDTO>) => {
    setBusy(true);
    try {
      const next = await apiPatch<UserSettingsDTO>("/api/settings", patch);
      setStart(next.quietHoursStart);
      setEnd(next.quietHoursEnd);
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
        {t("settings.quiet_hours")}
      </h2>
      <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Moon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{t("settings.quiet_hours")}</p>
            <p className="text-[11px] text-zinc-500">{t("settings.quiet_hours.desc")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-zinc-500">
            {t("settings.quiet_hours.start")}
            <select
              disabled={busy}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"
              value={start ?? ""}
              onChange={(event) => {
                const next = event.target.value === "" ? null : Number(event.target.value);
                setStart(next);
                void persist({ quietHoursStart: next, quietHoursEnd: end });
              }}
            >
              <option value="">{t("settings.quiet_hours.off")}</option>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-zinc-500">
            {t("settings.quiet_hours.end")}
            <select
              disabled={busy}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"
              value={end ?? ""}
              onChange={(event) => {
                const next = event.target.value === "" ? null : Number(event.target.value);
                setEnd(next);
                void persist({ quietHoursStart: start, quietHoursEnd: next });
              }}
            >
              <option value="">{t("settings.quiet_hours.off")}</option>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-[11px] text-zinc-500">
          {t("settings.daily_push_cap")}
          <span className="mt-0.5 block text-[11px] text-zinc-600">
            {t("settings.daily_push_cap.desc")}
          </span>
          <select
            disabled={busy}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-xs text-white"
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
