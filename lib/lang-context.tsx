"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import enFallback from "@/lib/lang/en.json";
import { apiPatch } from "@/lib/api/client";
import {
  REVIEWED_LANG_OPTIONS,
  type ReviewedLangOption,
} from "@/lib/i18n/reviewed-locales";
import type { LangCode } from "@/lib/lang-context-types";

export type { LangCode } from "@/lib/lang-context-types";

export type LangOption = ReviewedLangOption;

// Faz 3: öncelikli market dilleri MT QA sonrası seçicide açık.
export const LANG_OPTIONS: LangOption[] = REVIEWED_LANG_OPTIONS;

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
  void apiPatch("/api/profile", { locale: code }).catch(() => {
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
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SUPPORTED_LANGS = new Set<LangCode>(LANG_OPTIONS.map(({ code }) => code));

function isSupportedLang(value: string | null): value is LangCode {
  return value !== null && SUPPORTED_LANGS.has(value as LangCode);
}

function persistLangCookie(code: LangCode): void {
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(code)}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** localStorage tercihini oku; yoksa sunucunun seçtiği istek dilini koru. */
function getStoredLang(requestLang: LangCode): LangCode {
  if (typeof window === "undefined") return requestLang;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isSupportedLang(stored)) return stored;
  return requestLang;
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

export function LangProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  initialLang?: LangCode;
}) {
  const initialDictionary = enFallback;
  const [lang, setLangState] = useState<LangCode>(initialLang);
  const [unit, setUnitState] = useState<UnitSystem>("metric");
  const [dict, setDict] = useState<LangDict>(initialDictionary);
  const [enDict, setEnDict] = useState<LangDict>(enFallback);

  // Hydration sonrası eski localStorage tercihini cookie ile eşitle.
  useEffect(() => {
    const detected = getStoredLang(initialLang);
    if (detected !== initialLang) setLangState(detected);
    persistLangCookie(detected);
    const storedUnit = localStorage.getItem(UNIT_STORAGE_KEY) as UnitSystem | null;
    if (storedUnit === "metric" || storedUnit === "imperial") {
      setUnitState(storedUnit);
    }
  }, [initialLang]);


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
    persistLangCookie(code);
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

  // Dil değiştiğinde doküman semantiğini de eşitle.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtlLang(lang) ? "rtl" : "ltr";
  }, [lang]);

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

  const value = useMemo<LangContextType>(
    () => ({ lang, setLang, unit, setUnit, t }),
    [lang, setLang, unit, setUnit, t],
  );

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  );

}

export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}
