"use client";

import Link from "next/link";
import {
  Fingerprint,
  ArrowLeft,
  Bell,
  EyeOff,
  Globe,
  LogOut,
  Search,
  Shield,
  LayoutDashboard,
  User,
  Volume2,
  Check,
  Gift,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { InlineAlert } from "@/components/InlineAlert";
import { PushToggle } from "@/components/notifications/PushToggle";
import { useTheme } from "@/lib/theme-context";
import { useLang, LANG_OPTIONS, hasStoredLangPreference } from "@/lib/lang-context";
import { useSession } from "@/lib/session-context";
import { apiGet, apiPatch } from "@/lib/api/client";
import type { UserSettingsDTO } from "@/lib/services/settings.service";
import { UsageQuotaSection } from "@/components/settings/UsageQuotaSection";

type SettingItem = {
  icon: typeof Bell;
  label: string;
  description: string;
  type: "toggle" | "select" | "link" | "info";
  value?: string;
  options?: string[];
  href?: string;
};

const SETTINGS_GROUPS: { title: string; items: SettingItem[] }[] = [
  {
    title: "settings.profile",
    items: [
      {
        icon: User,
        label: "settings.personal",
        description: "settings.personal.desc",
        type: "link",
        value: "settings.personal.action",
        href: "/welcome?profile=1",
      },
      {
        icon: Shield,
        label: "settings.privacy",
        description: "settings.privacy.desc",
        type: "link",
        value: "settings.privacy.action",
        href: "/settings/security",
      },
    ],
  },
  {
    title: "settings.privacy_section",
    items: [
      {
        icon: EyeOff,
        label: "settings.leaderboard_opt_out",
        description: "settings.leaderboard_opt_out.desc",
        type: "toggle",
      },
      {
        icon: Bell,
        label: "settings.marketing_emails",
        description: "settings.marketing_emails.desc",
        type: "toggle",
      },
    ],
  },
  {
    title: "settings.legal_section",
    items: [
      {
        icon: Shield,
        label: "settings.legal.privacy",
        description: "settings.legal.privacy.desc",
        type: "link",
        value: "settings.legal.open",
        href: "/privacy",
      },
      {
        icon: Shield,
        label: "settings.legal.terms",
        description: "settings.legal.terms.desc",
        type: "link",
        value: "settings.legal.open",
        href: "/terms&conditions",
      },
      {
        icon: Shield,
        label: "settings.legal.cookies",
        description: "settings.legal.cookies.desc",
        type: "link",
        value: "settings.legal.open",
        href: "/cookies",
      },
    ],
  },
  {
    title: "settings.notifications",
    items: [
      { icon: Bell, label: "settings.workout", description: "settings.workout.desc", type: "toggle" },
      { icon: Bell, label: "settings.water", description: "settings.water.desc", type: "toggle" },
    ],
  },
  {
    title: "settings.language",
    items: [
      { icon: Globe, label: "settings.lang", description: "settings.lang.desc", type: "select", value: "Türkçe" },
      {
        icon: Globe,
        label: "settings.unit",
        description: "settings.unit.desc",
        type: "select",
        value: "settings.unit.metric",
        options: ["settings.unit.metric", "settings.unit.imperial"],
      },
    ],
  },
  {
    title: "settings.sound",
    items: [
      { icon: Volume2, label: "settings.sfx", description: "settings.sfx.desc", type: "toggle" },
      { icon: Volume2, label: "settings.chat.sfx", description: "settings.chat.sfx.desc", type: "toggle" },
    ],
  },
  {
    title: "settings.account",
    items: [
      {
        icon: LogOut,
        label: "settings.logout",
        description: "settings.logout.desc",
        type: "link",
        value: "settings.logout.action",
        href: "/login",
      },
    ],
  },
];

const ADMIN_SETTINGS_GROUP: { title: string; items: SettingItem[] } = {
  title: "settings.admin.section",
  items: [
    {
      icon: LayoutDashboard,
      label: "settings.admin.hub",
      description: "settings.admin.hub.desc",
      type: "link",
      value: "settings.admin.hub.action",
      href: "/admin",
    },
  ],
};

const SFX_KEY = "kaify-sfx-enabled";
const CHAT_SFX_KEY = "kaify-chat-sfx-enabled";

function loadBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const val = localStorage.getItem(key);
  if (val === null) return fallback;
  return val === "true";
}

function saveBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value ? "true" : "false");
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, unit, setUnit, t } = useLang();
  const { referralCode: sessionReferralCode, isAuthenticated, profile, isAdmin } = useSession();

  const [referralCode, setReferralCode] = useState("");
  const [referralCopied, setReferralCopied] = useState(false);
  const [userIdCopied, setUserIdCopied] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    "settings.workout": true,
    "settings.water": false,
    "settings.dark_mode": theme === "dark",
    "settings.sfx": loadBoolean(SFX_KEY, true),
    "settings.chat.sfx": loadBoolean(CHAT_SFX_KEY, true),
    "settings.leaderboard_opt_out": false,
    "settings.marketing_emails": true,
  });

  const persistSettings = useCallback(
    async (patch: Partial<UserSettingsDTO>) => {
      if (!isAuthenticated) return;
      try {
        await apiPatch<UserSettingsDTO>("/api/settings", patch);
        setSaveError(null);
      } catch {
        setSaveError(t("settings.save_error"));
      }
    },
    [isAuthenticated, t],
  );

  useEffect(() => {
    if (isAuthenticated && sessionReferralCode) {
      setReferralCode(sessionReferralCode);
      return;
    }
    if (!isAuthenticated) {
      import("@/lib/referral").then((m) => setReferralCode(m.getReferralCode()));
    }
  }, [isAuthenticated, sessionReferralCode]);

  const reloadSettings = useCallback(() => {
    if (!isAuthenticated) {
      setSettingsLoaded(true);
      return;
    }
    setLoadError(null);
    setSettingsLoaded(false);
    apiGet<UserSettingsDTO>("/api/settings")
      .then((s) => {
        setToggles((prev) => ({
          ...prev,
          "settings.workout": s.workoutReminders,
          "settings.water": s.waterReminder,
          "settings.sfx": s.soundEffects,
          "settings.chat.sfx": s.chatSounds,
          "settings.leaderboard_opt_out": s.leaderboardOptOut,
          "settings.marketing_emails": s.marketingEmails,
        }));
        saveBoolean(SFX_KEY, s.soundEffects);
        saveBoolean(CHAT_SFX_KEY, s.chatSounds);
        setUnit(s.unitSystem);
        setLoadError(null);
      })
      .catch(() => setLoadError(t("settings.load_error")))
      .finally(() => setSettingsLoaded(true));
  }, [isAuthenticated, setUnit, t]);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  useEffect(() => {
    if (hasStoredLangPreference()) return;
    if (isAuthenticated && profile?.locale) {
      const base = profile.locale.split("-")[0].toLowerCase();
      const match = LANG_OPTIONS.find((o) => o.code === base || o.code === profile.locale);
      if (match) setLang(match.code);
    }
  }, [isAuthenticated, profile?.locale, setLang]);

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      if (!isAuthenticated) {
        const { copyReferralCode } = await import("@/lib/referral");
        const success = await copyReferralCode();
        if (success) {
          setReferralCopied(true);
          setTimeout(() => setReferralCopied(false), 2000);
        }
      }
    }
  };

  const handleCopyUserId = async () => {
    if (!profile?.id) return;
    try {
      await navigator.clipboard.writeText(profile.id);
      setUserIdCopied(true);
      setTimeout(() => setUserIdCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleShareReferral = async () => {
    const text = t("settings.referral.share_text", { code: referralCode });
    try {
      if (navigator.share) {
        await navigator.share({ title: t("settings.referral.share_title"), text });
        return;
      }
    } catch {
      // fall through
    }
    if (!isAuthenticated) {
      const { shareReferralCode } = await import("@/lib/referral");
      await shareReferralCode();
    }
  };

  const persistLocale = useCallback(
    async (code: string) => {
      if (!isAuthenticated) return;
      try {
        await apiPatch("/api/profile", { locale: code });
        setSaveError(null);
      } catch {
        setSaveError(t("settings.save_error"));
      }
    },
    [isAuthenticated, t],
  );

  const filteredLangs = useMemo(() => {
    if (!langSearch.trim()) return LANG_OPTIONS;
    const q = langSearch.toLowerCase();
    return LANG_OPTIONS.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.code.toLowerCase().includes(q),
    );
  }, [langSearch]);

  useEffect(() => {
    setToggles((prev) => ({ ...prev, "settings.dark_mode": theme === "dark" }));
  }, [theme]);

  const toggleSwitch = async (label: string) => {
    if (label === "settings.dark_mode") {
      toggleTheme();
      return;
    }

    const prevVal = toggles[label];
    const newVal = !prevVal;
    setToggles((prev) => ({ ...prev, [label]: newVal }));

    if (label === "settings.sfx") saveBoolean(SFX_KEY, newVal);
    if (label === "settings.chat.sfx") saveBoolean(CHAT_SFX_KEY, newVal);

    if (!isAuthenticated) return;

    const patch: Partial<UserSettingsDTO> = {};
    if (label === "settings.workout") patch.workoutReminders = newVal;
    if (label === "settings.water") patch.waterReminder = newVal;
    if (label === "settings.sfx") patch.soundEffects = newVal;
    if (label === "settings.chat.sfx") patch.chatSounds = newVal;
    if (label === "settings.leaderboard_opt_out") patch.leaderboardOptOut = newVal;
    if (label === "settings.marketing_emails") patch.marketingEmails = newVal;

    if (Object.keys(patch).length === 0) return;

    try {
      await apiPatch<UserSettingsDTO>("/api/settings", patch);
      setSaveError(null);
    } catch {
      setToggles((prev) => ({ ...prev, [label]: prevVal }));
      if (label === "settings.sfx") saveBoolean(SFX_KEY, prevVal);
      if (label === "settings.chat.sfx") saveBoolean(CHAT_SFX_KEY, prevVal);
      setSaveError(t("settings.save_error"));
    }
  };

  const currentLangLabel = LANG_OPTIONS.find((o) => o.code === lang)?.label ?? lang;

  const settingsGroups = useMemo(() => {
    const groups = SETTINGS_GROUPS.filter(
      (group) => group.title !== "settings.privacy_section" || isAuthenticated,
    );
    if (isAuthenticated && isAdmin) {
      return [ADMIN_SETTINGS_GROUP, ...groups];
    }
    return groups;
  }, [isAuthenticated, isAdmin]);

  return (
    <div className="phone-shell analytics-gradient relative flex flex-col">
      <header className="animate-in animate-in--1 flex items-center justify-between px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t("nav.back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-medium text-white">{t("settings.title")}</h1>
        <div className="h-9 w-9" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        {loadError && (
          <InlineAlert
            className="mt-2"
            message={loadError}
            onDismiss={() => setLoadError(null)}
            onRetry={reloadSettings}
            retryLabel={t("common.retry")}
            dismissLabel={t("common.dismiss")}
          />
        )}
        {saveError && (
          <InlineAlert
            className="mt-2"
            message={saveError}
            onDismiss={() => setSaveError(null)}
            dismissLabel={t("common.dismiss")}
          />
        )}

        {isAuthenticated && !settingsLoaded && (
          <div className="mt-4 space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        )}

        {isAuthenticated && <UsageQuotaSection />}

        {isAuthenticated && <PushToggle />}

        {(!isAuthenticated || settingsLoaded) &&
          settingsGroups.map((group, gi) => (
          <section
            key={group.title}
            className="animate-in mt-5 first:mt-2"
            style={{ animationDelay: `${0.1 + gi * 0.05}s` }}
          >
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              {t(group.title)}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
              {group.items.map((item, ii) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    ii < group.items.length - 1 ||
                    (group.title === "settings.profile" && isAuthenticated && profile?.id)
                      ? "border-b border-white/5"
                      : ""
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                    <item.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium text-white">{t(item.label)}</span>
                    <span className="text-[11px] text-zinc-500">{t(item.description)}</span>
                  </div>

                  <div className="shrink-0">
                    {item.type === "toggle" && (
                      <button
                        type="button"
                        disabled={isAuthenticated && !settingsLoaded}
                        onClick={() => void toggleSwitch(item.label)}
                        className={`relative h-6 w-10 rounded-full transition-colors disabled:opacity-50 ${
                          toggles[item.label] ? "bg-purple-500" : "bg-zinc-700"
                        }`}
                        aria-pressed={toggles[item.label]}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            toggles[item.label] ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    )}
                    {item.type === "select" && item.label === "settings.lang" && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setLangPickerOpen(!langPickerOpen)}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.06]"
                        >
                          <span className="max-w-[130px] truncate">{currentLangLabel}</span>
                          <svg
                            className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${langPickerOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {langPickerOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => {
                                setLangPickerOpen(false);
                                setLangSearch("");
                              }}
                            />
                            <div className="fixed left-1/2 top-1/2 z-50 max-h-[70vh] w-[320px] -translate-x-1/2 -translate-y-1/2 animate-in overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
                              <div className="relative border-b border-white/5 px-3 py-2.5">
                                <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                                <input
                                  type="text"
                                  value={langSearch}
                                  onChange={(e) => setLangSearch(e.target.value)}
                                  placeholder={`${t("settings.lang")}...`}
                                  autoFocus
                                  className="w-full rounded-lg border border-white/5 bg-white/[0.03] py-1.5 pl-7 pr-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-purple-500/40"
                                />
                              </div>
                              <div className="max-h-[280px] overflow-y-auto overscroll-contain py-1">
                                {filteredLangs.length === 0 ? (
                                  <div className="px-4 py-6 text-center text-xs text-zinc-600">
                                    {t("settings.lang_not_found")}
                                  </div>
                                ) : (
                                  filteredLangs.map((opt) => {
                                    const isActive = lang === opt.code;
                                    return (
                                      <button
                                        key={opt.code}
                                        type="button"
                                        onClick={() => {
                                          setLang(opt.code);
                                          void persistLocale(opt.code);
                                          setLangPickerOpen(false);
                                          setLangSearch("");
                                        }}
                                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition ${
                                          isActive
                                            ? "bg-purple-500/10 text-purple-300"
                                            : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                                        }`}
                                      >
                                        <span className="flex-1 truncate">{opt.label}</span>
                                        {isActive && (
                                          <Check className="h-3.5 w-3.5 shrink-0 text-purple-400" strokeWidth={2.5} />
                                        )}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {item.type === "select" && item.label === "settings.unit" && (
                      <select
                        value={unit === "metric" ? "settings.unit.metric" : "settings.unit.imperial"}
                        onChange={(e) => {
                          const next = e.target.value === "settings.unit.metric" ? "metric" : "imperial";
                          setUnit(next);
                          if (isAuthenticated) {
                            void persistSettings({ unitSystem: next });
                          }
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 outline-none transition focus:border-purple-500/50"
                      >
                        <option value="settings.unit.metric" className="bg-zinc-900">
                          {t("settings.unit.metric")}
                        </option>
                        <option value="settings.unit.imperial" className="bg-zinc-900">
                          {t("settings.unit.imperial")}
                        </option>
                      </select>
                    )}
                    {item.type === "link" &&
                      (item.href ? (
                        <Link
                          href={item.href}
                          className="text-xs font-medium text-purple-400 transition hover:text-purple-300"
                        >
                          {t(item.value || "")}
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-purple-400">{t(item.value || "")}</span>
                      ))}
                  </div>
                </div>
              ))}
              {group.title === "settings.profile" && isAuthenticated && profile?.id && (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                    <Fingerprint className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium text-white">{t("settings.user_id")}</span>
                    <span className="truncate font-mono text-[11px] text-zinc-500">{profile.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyUserId()}
                    className="shrink-0 text-xs font-medium text-purple-400 transition hover:text-purple-300"
                  >
                    {userIdCopied ? t("settings.user_id.copied") : t("settings.user_id.copy")}
                  </button>
                </div>
              )}
            </div>
          </section>
        ))}

        <section className="animate-in mt-5" style={{ animationDelay: "0.5s" }}>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03]">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Gift className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-white">{t("settings.referral")}</span>
                <span className="text-[11px] text-zinc-500">{t("settings.referral.desc")}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <span className="font-mono text-base font-bold tracking-wider text-purple-400">
                {referralCode || "......"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopyReferral()}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {referralCopied ? t("settings.referral.copied") : t("settings.referral.copy")}
                </button>
                <span className="text-xs text-zinc-600">·</span>
                <button
                  type="button"
                  onClick={() => void handleShareReferral()}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {t("settings.referral.share")}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-4 mt-8 text-center">
          <p className="text-[11px] text-zinc-600">{t("settings.version")}</p>
        </div>
      </main>
    </div>
  );
}
