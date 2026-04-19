import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import en from "./en.json";
import tr from "./tr.json";
import ar from "./ar.json";
import de from "./de.json";

export type Locale = "en" | "tr" | "ar" | "de";

const TRANSLATIONS: Record<Locale, Record<string, any>> = { en, tr, ar, de };
const STORAGE_KEY = "verde-lang";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<Ctx>({
  locale: "en",
  setLocale: () => {},
  t: (k) => k,
  dir: "ltr",
});

const SUPPORTED: Locale[] = ["en", "tr", "ar", "de"];

function detectLocale(): Locale {
  // 1. URL param: ?lang=tr
  if (typeof window !== "undefined") {
    const param = new URLSearchParams(window.location.search).get("lang");
    if (param && SUPPORTED.includes(param as Locale)) return param as Locale;
  }

  // 2. localStorage (returning visitor)
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved as Locale)) return saved as Locale;
  }

  // 3. Browser language
  if (typeof navigator !== "undefined") {
    const langs = navigator.languages ?? [navigator.language];
    for (const lang of langs) {
      const code = lang.split("-")[0].toLowerCase();
      if (SUPPORTED.includes(code as Locale)) return code as Locale;
    }
  }

  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";

  // Sync ?lang= param on navigation
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("lang");
    if (param && SUPPORTED.includes(param as Locale) && param !== locale) {
      setLocaleState(param as Locale);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let val: any = TRANSLATIONS[locale];
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) return key;
    }
    if (typeof val !== "string") return key;
    if (params) {
      return val.replace(/\{\{(\w+)\}\}/g, (_: string, name: string) =>
        params[name] !== undefined ? String(params[name]) : `{{${name}}}`
      );
    }
    return val;
  }, [locale]);

  const ctx = useMemo(() => ({ locale, setLocale, t, dir }), [locale, setLocale, t, dir]);

  return <LanguageContext.Provider value={ctx}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
