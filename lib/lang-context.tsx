"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import enFallback from "@/lib/lang/en.json";

// Sadece JSON dosyası olan diller
export type LangCode =
  | "tr" | "en"
  | "de" | "fr" | "es" | "es-mx" | "es-ar" | "it" | "pt" | "nl"
  | "ru" | "pl" | "ro" | "el" | "sv" | "cs" | "hu" | "uk"
  | "da" | "no" | "fi" | "lt" | "lv" | "et" | "sk" | "sl"
  | "hr" | "bg" | "sr" | "is" | "mt"
  | "sq" | "bs" | "mk" | "be" | "lb"
  | "kk" | "uz" | "az"
  | "ar" | "he" | "fa" | "ur"
  | "af" | "yo"
  | "hi" | "zh-CN" | "ja" | "ko" | "vi" | "th" | "id" | "ms" | "bn";

export interface LangOption {
  code: LangCode;
  label: string;
}

// Tek kaynak: Tüm diller ve görünen adları
export const LANG_OPTIONS: LangOption[] = [
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "en", label: "🇬🇧 English" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "es", label: "🇪🇸 Español" },
  { code: "es-mx", label: "🇲🇽 Español (MX)" },
  { code: "es-ar", label: "🇦🇷 Español (AR)" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "pt", label: "🇵🇹 Português" },
  { code: "nl", label: "🇳🇱 Nederlands" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "pl", label: "🇵🇱 Polski" },
  { code: "ro", label: "🇷🇴 Română" },
  { code: "el", label: "🇬🇷 Ελληνικά" },
  { code: "sv", label: "🇸🇪 Svenska" },
  { code: "cs", label: "🇨🇿 Čeština" },
  { code: "hu", label: "🇭🇺 Magyar" },
  { code: "uk", label: "🇺🇦 Українська" },
  { code: "da", label: "🇩🇰 Dansk" },
  { code: "no", label: "🇳🇴 Norsk" },
  { code: "fi", label: "🇫🇮 Suomi" },
  { code: "lt", label: "🇱🇹 Lietuvių" },
  { code: "lv", label: "🇱🇻 Latviešu" },
  { code: "et", label: "🇪🇪 Eesti" },
  { code: "sk", label: "🇸🇰 Slovenčina" },
  { code: "sl", label: "🇸🇮 Slovenščina" },
  { code: "hr", label: "🇭🇷 Hrvatski" },
  { code: "bg", label: "🇧🇬 Български" },
  { code: "sr", label: "🇷🇸 Српски" },
  { code: "is", label: "🇮🇸 Íslenska" },
  { code: "mt", label: "🇲🇹 Malti" },
  { code: "sq", label: "🇦🇱 Shqip" },
  { code: "bs", label: "🇧🇦 Bosanski" },
  { code: "mk", label: "🇲🇰 Македонски" },
  { code: "be", label: "🇧🇾 Беларуская" },
  { code: "lb", label: "🇱🇺 Lëtzebuergesch" },
  { code: "ar", label: "🇸🇦 العربية" },
  { code: "he", label: "🇮🇱 עברית" },
  { code: "fa", label: "🇮🇷 فارسی" },
  { code: "ur", label: "🇵🇰 اردو" },
  { code: "af", label: "🇿🇦 Afrikaans" },
  { code: "yo", label: "🇳🇬 Yorùbá" },
  { code: "hi", label: "🇮🇳 हिन्दी" },
  { code: "zh-CN", label: "🇨🇳 中文" },
  { code: "ja", label: "🇯🇵 日本語" },
  { code: "ko", label: "🇰🇷 한국어" },
  { code: "vi", label: "🇻🇳 Tiếng Việt" },
  { code: "th", label: "🇹🇭 ภาษาไทย" },
  { code: "id", label: "🇮🇩 Bahasa Indonesia" },
  { code: "ms", label: "🇲🇾 Bahasa Melayu" },
  { code: "bn", label: "🇧🇩 বাংলা" },
  { code: "kk", label: "🇰🇿 Қазақша" },
  { code: "uz", label: "🇺🇿 Oʻzbekcha" },
  { code: "az", label: "🇦🇿 Azərbaycan dili" },
];

export type UnitSystem = "metric" | "imperial";

type LangDict = Record<string, string>;

/** Right-to-left languages — the document direction must flip for these. */
const RTL_LANGS: ReadonlySet<LangCode> = new Set<LangCode>([
  "ar",
  "he",
  "fa",
  "ur",
]);

export function isRtlLang(code: LangCode): boolean {
  return RTL_LANGS.has(code);
}

/**
 * Persists the chosen language to the user's profile so the BACKEND
 * (push notifications, AI coach replies) speaks the same language as the UI.
 * Fire-and-forget: anonymous users (401) and offline failures are ignored.
 */
function persistLocaleToProfile(code: LangCode): void {
  if (typeof window === "undefined") return;
  void fetch("/api/profile", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: code }),
  }).catch(() => {
    // Non-fatal: language still applies locally via localStorage.
  });
}

interface LangContextType {
  /** Mevcut dil kodu */
  lang: LangCode;
  /** Dili değiştir */
  setLang: (code: LangCode) => void;
  /** Mevcut ölçü birimi sistemi */
  unit: UnitSystem;
  /** Ölçü birimi sistemini değiştir */
  setUnit: (unit: UnitSystem) => void;
  /** Bir anahtarın çevirisini döndürür. {name} gibi placeholder'ları params ile değiştirir. */
  t: (key: string, params?: Record<string, string | number>) => string;
}


const LangContext = createContext<LangContextType | null>(null);

const STORAGE_KEY = "kaify-lang";
const UNIT_STORAGE_KEY = "kaify-unit";

/** Tarayıcı diline göre varsayılan dili belirle */

function detectBrowserLang(): LangCode {
  if (typeof window === "undefined") return "en";
  const navLang = (navigator.language ?? "en").toLowerCase();
  const base = navLang.split("-")[0];
  const exact = LANG_OPTIONS.find((o) => o.code === navLang || o.code === base);
  if (exact) return exact.code;
  if (navLang.startsWith("tr")) return "tr";
  if (navLang.startsWith("de")) return "de";
  if (navLang.startsWith("fr")) return "fr";
  if (navLang.startsWith("es")) return "es";
  return "en";
}

/** localStorage'dan dili oku, yoksa tarayıcı dilini kullan */
function getStoredLang(): LangCode {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (stored) return stored;
  return detectBrowserLang();
}

/**
 * Kullanıcının cihazda açıkça seçtiği bir dil var mı?
 * (localStorage yalnızca setLang ile — yani kullanıcı seçince — yazılır.)
 * Profil locale'i yalnızca kullanıcı henüz seçim yapmadıysa uygulanmalı;
 * aksi halde sayfalar arası gezinmede bayat profil locale'i seçimi ezer.
 */
export function hasStoredLangPreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) != null;
}

/** Dil JSON'larını dinamik import et */
const langModules: Record<string, () => Promise<{ default: LangDict }>> = {
  tr: () => import("@/lib/lang/tr.json"),
  en: () => import("@/lib/lang/en.json"),
  de: () => import("@/lib/lang/de.json"),
  fr: () => import("@/lib/lang/fr.json"),
  es: () => import("@/lib/lang/es.json"),
  "es-mx": () => import("@/lib/lang/es-mx.json"),
  "es-ar": () => import("@/lib/lang/es-ar.json"),
  it: () => import("@/lib/lang/it.json"),
  pt: () => import("@/lib/lang/pt.json"),
  nl: () => import("@/lib/lang/nl.json"),
  ru: () => import("@/lib/lang/ru.json"),
  pl: () => import("@/lib/lang/pl.json"),
  ro: () => import("@/lib/lang/ro.json"),
  el: () => import("@/lib/lang/el.json"),
  sv: () => import("@/lib/lang/sv.json"),
  cs: () => import("@/lib/lang/cs.json"),
  hu: () => import("@/lib/lang/hu.json"),
  uk: () => import("@/lib/lang/uk.json"),
  da: () => import("@/lib/lang/da.json"),
  no: () => import("@/lib/lang/no.json"),
  fi: () => import("@/lib/lang/fi.json"),
  lt: () => import("@/lib/lang/lt.json"),
  lv: () => import("@/lib/lang/lv.json"),
  et: () => import("@/lib/lang/et.json"),
  sk: () => import("@/lib/lang/sk.json"),
  sl: () => import("@/lib/lang/sl.json"),
  hr: () => import("@/lib/lang/hr.json"),
  bg: () => import("@/lib/lang/bg.json"),
  sr: () => import("@/lib/lang/sr.json"),
  is: () => import("@/lib/lang/is.json"),
  mt: () => import("@/lib/lang/mt.json"),
  sq: () => import("@/lib/lang/sq.json"),
  bs: () => import("@/lib/lang/bs.json"),
  mk: () => import("@/lib/lang/mk.json"),
  be: () => import("@/lib/lang/be.json"),
  lb: () => import("@/lib/lang/lb.json"),
  kk: () => import("@/lib/lang/kk.json"),
  uz: () => import("@/lib/lang/uz.json"),
  ar: () => import("@/lib/lang/ar.json"),
  he: () => import("@/lib/lang/he.json"),
  fa: () => import("@/lib/lang/fa.json"),
  ur: () => import("@/lib/lang/ur.json"),
  az: () => import("@/lib/lang/az.json"),
  af: () => import("@/lib/lang/af.json"),
  yo: () => import("@/lib/lang/yo.json"),
  hi: () => import("@/lib/lang/hi.json"),
  "zh-CN": () => import("@/lib/lang/zh-CN.json"),
  ja: () => import("@/lib/lang/ja.json"),
  ko: () => import("@/lib/lang/ko.json"),
  vi: () => import("@/lib/lang/vi.json"),
  th: () => import("@/lib/lang/th.json"),
  id: () => import("@/lib/lang/id.json"),
  ms: () => import("@/lib/lang/ms.json"),
  bn: () => import("@/lib/lang/bn.json"),
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");
  const [unit, setUnitState] = useState<UnitSystem>("metric");
  const [dict, setDict] = useState<LangDict>({});
  const [enDict, setEnDict] = useState<LangDict>({});
  const [mounted, setMounted] = useState(false);

  // İlk mount: localStorage + tarayıcı dilini oku
  useEffect(() => {
    const detected = getStoredLang();
    setLangState(detected);
    const storedUnit = localStorage.getItem(UNIT_STORAGE_KEY) as UnitSystem | null;
    if (storedUnit === "metric" || storedUnit === "imperial") {
      setUnitState(storedUnit);
    }
    setMounted(true);
  }, []);


  // Her zaman en.json'u da yükle (fallback için)
  useEffect(() => {
    langModules["en"]().then((m) => {
      setEnDict(m.default);
    });
  }, []);

  // Dil değişince JSON'u yükle
  useEffect(() => {
    const mod = langModules[lang];
    if (mod) {
      mod().then((m) => {
        setDict(m.default);
      });
    }
  }, [lang]);

  const setLang = useCallback((code: LangCode) => {
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
    // html lang + dir attribute'larını güncelle (RTL diller için)
    document.documentElement.lang = code;
    document.documentElement.dir = isRtlLang(code) ? "rtl" : "ltr";
    // Dili backend profiline yaz (push/AI aynı dili konuşsun)
    persistLocaleToProfile(code);
  }, []);

  const setUnit = useCallback((newUnit: UnitSystem) => {
    localStorage.setItem(UNIT_STORAGE_KEY, newUnit);
    setUnitState(newUnit);
  }, []);

  // İlk yüklemede html lang'i ayarla

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
      document.documentElement.dir = isRtlLang(lang) ? "rtl" : "ltr";
    }
  }, [mounted, lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Önce mevcut dilin JSON'una bak
      let text = dict[key];
      // 2. Bulamazsa İngilizce fallback'e bak
      if (text === undefined) {
        text = enDict[key];
      }
      // 3. Onda da yoksa statik en.json (SSR / ilk paint)
      if (text === undefined) {
        text = enFallback[key as keyof typeof enFallback];
      }
      // 4. Onda da yoksa anahtarın kendisini göster
      if (text === undefined) {
        return key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [dict, enDict],
  );

  const ssrT = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = enFallback[key as keyof typeof enFallback];
      if (text === undefined) return key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [],
  );

  if (!mounted) {
    // SSR / hydration: İngilizce fallback — ham anahtar gösterme
    return (
      <LangContext.Provider value={{ lang: "en", setLang, unit: "metric", setUnit, t: ssrT }}>
        {children}
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang, unit, setUnit, t }}>
      {children}
    </LangContext.Provider>
  );

}

export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}
