"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type LangCode = "tr" | "en";

type LangDict = Record<string, string>;

interface LangContextType {
  /** Mevcut dil kodu */
  lang: LangCode;
  /** Dili değiştir */
  setLang: (code: LangCode) => void;
  /** Bir anahtarın çevirisini döndürür. {name} gibi placeholder'ları params ile değiştirir. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextType | null>(null);

const STORAGE_KEY = "kaify-lang";

/** Tarayıcı diline göre varsayılan dili belirle */
function detectBrowserLang(): LangCode {
  if (typeof window === "undefined") return "tr";
  const navLang = navigator.language?.toLowerCase() || "";
  if (navLang.startsWith("tr")) return "tr";
  return "en";
}

/** localStorage'dan dili oku, yoksa tarayıcı dilini kullan */
function getStoredLang(): LangCode {
  if (typeof window === "undefined") return "tr";
  const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (stored === "tr" || stored === "en") return stored;
  return detectBrowserLang();
}

/** Dil JSON'larını dinamik import et */
const langModules: Record<LangCode, () => Promise<{ default: LangDict }>> = {
  tr: () => import("@/lib/lang/tr.json"),
  en: () => import("@/lib/lang/en.json"),
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("tr");
  const [dict, setDict] = useState<LangDict>({});
  const [mounted, setMounted] = useState(false);

  // İlk mount: localStorage + tarayıcı dilini oku
  useEffect(() => {
    const detected = getStoredLang();
    setLangState(detected);
    setMounted(true);
  }, []);

  // Dil değişince JSON'u yükle
  useEffect(() => {
    langModules[lang]().then((mod) => {
      setDict(mod.default);
    });
  }, [lang]);

  const setLang = useCallback((code: LangCode) => {
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
    // html lang attribute'unu güncelle
    document.documentElement.lang = code;
  }, []);

  // İlk yüklemede html lang'i ayarla
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
    }
  }, [mounted, lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = dict[key];
      if (text === undefined) {
        // Fallback: anahtarı olduğu gibi göster
        return key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [dict],
  );

  if (!mounted) {
    // SSR sırasında boş bir context ver
    return (
      <LangContext.Provider value={{ lang: "tr", setLang, t: (key) => key }}>
        {children}
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
}
