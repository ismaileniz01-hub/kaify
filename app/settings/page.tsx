"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Globe, LogOut, Shield, User, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme-context";
import { useLang, type LangCode } from "@/lib/lang-context";

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
    title: "Profil & Hesap",
    items: [
      { icon: User, label: "Kişisel Bilgiler", description: "Ad, boy, kilo, cinsiyet", type: "link", value: "Düzenle", href: "/welcome?profile=1" },
      { icon: Shield, label: "Gizlilik", description: "Profil görünürlüğü, veri paylaşımı", type: "link", value: "Yönet" },
    ],
  },
  {
    title: "Bildirimler",
    items: [
      { icon: Bell, label: "Push Bildirimleri", description: "Hatırlatma ve güncellemeler", type: "toggle" },
      { icon: Bell, label: "Antrenman Hatırlatıcıları", description: "Günlük egzersiz zamanı", type: "toggle" },
      { icon: Bell, label: "Su İçme Hatırlatıcısı", description: "Saat başı su molası", type: "toggle" },
    ],
  },
  {
    title: "Dil & Bölge",
    items: [
      { icon: Globe, label: "Dil", description: "Uygulama dili", type: "select", value: "Türkçe", options: ["Türkçe", "English", "Deutsch", "Français"] },
      { icon: Globe, label: "Birim Sistemi", description: "Metrik / Imperial", type: "select", value: "Metrik (kg, cm)", options: ["Metrik (kg, cm)", "Imperial (lb, ft)"] },
    ],
  },
  {
    title: "Ses",
    items: [
      { icon: Volume2, label: "Ses Efektleri", description: "Uygulama geneli ses efektleri (mesajlaşma hariç)", type: "toggle" },
      { icon: Volume2, label: "Mesajlaşma Sesi", description: "Mesaj gönderme/alma sesleri", type: "toggle" },
    ],
  },
  {
    title: "Hesap",
    items: [
      { icon: LogOut, label: "Çıkış Yap", description: "Hesabından çıkış yap", type: "link", value: "Çıkış", href: "/" },
    ],
  },
];

// localStorage anahtarları
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

const LANG_OPTIONS: { code: LangCode; label: string }[] = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
];

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    "Push Bildirimleri": true,
    "Antrenman Hatırlatıcıları": true,
    "Su İçme Hatırlatıcısı": false,
    "Karanlık Mod": theme === "dark",
    "Animasyonlar": true,
    "Sadece Wi-Fi": false,
    "Ses Efektleri": loadBoolean(SFX_KEY, true),
    "Mesajlaşma Sesi": loadBoolean(CHAT_SFX_KEY, true),
  });

  // Theme değişince toggle'ı senkronize et
  useEffect(() => {
    setToggles((prev) => ({ ...prev, "Karanlık Mod": theme === "dark" }));
  }, [theme]);

  const toggleSwitch = (label: string) => {
    if (label === "Karanlık Mod") {
      toggleTheme();
      return;
    }

    const newVal = !toggles[label];
    setToggles((prev) => ({ ...prev, [label]: newVal }));

    // Ses ayarlarını localStorage'a kaydet
    if (label === "Ses Efektleri") {
      saveBoolean(SFX_KEY, newVal);
    } else if (label === "Mesajlaşma Sesi") {
      saveBoolean(CHAT_SFX_KEY, newVal);
    }
  };

  return (
    <div className="phone-shell analytics-gradient relative flex flex-col">
      <header className="animate-in animate-in--1 flex items-center justify-between px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Geri"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-medium text-white">
          Ayarlar
        </h1>
        <div className="h-9 w-9" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        {SETTINGS_GROUPS.map((group, gi) => (
          <section key={gi} className="animate-in mt-5 first:mt-2" style={{ animationDelay: `${0.1 + gi * 0.05}s` }}>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              {group.title}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
              {group.items.map((item, ii) => (
                <div
                  key={ii}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    ii < group.items.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  {/* İkon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                    <item.icon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  </div>

                  {/* Label + description */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium text-white">{item.label}</span>
                    <span className="text-[11px] text-zinc-500">{item.description}</span>
                  </div>

                  {/* Kontrol */}
                  <div className="shrink-0">
                    {item.type === "toggle" && (
                      <button
                        type="button"
                        onClick={() => toggleSwitch(item.label)}
                        className={`relative h-6 w-10 rounded-full transition-colors ${
                          toggles[item.label] ? "bg-purple-500" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            toggles[item.label] ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    )}
                    {item.type === "select" && item.label === "Dil" && (
                      <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value as LangCode)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 outline-none transition focus:border-purple-500/50"
                      >
                        {LANG_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code} className="bg-zinc-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {item.type === "select" && item.label !== "Dil" && (
                      <select
                        defaultValue={item.value}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 outline-none transition focus:border-purple-500/50"
                      >
                        {item.options?.map((opt) => (
                          <option key={opt} value={opt} className="bg-zinc-900">
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                    {item.type === "link" && (
                      item.href ? (
                        <Link href={item.href} className="text-xs font-medium text-purple-400 hover:text-purple-300 transition">
                          {item.value}
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-purple-400">{item.value}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Versiyon bilgisi */}
        <div className="mt-8 mb-4 text-center">
          <p className="text-[11px] text-zinc-600">K.AIFY v1.0.0</p>
        </div>
      </main>
    </div>
  );
}
