import React from "react";
import { useLanguage, Locale } from "../i18n/LanguageContext";

const LANGS: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
  { code: "de", label: "DE" },
  { code: "ar", label: "ع" },
];

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="lang-sel" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn ${locale === l.code ? "lang-btn--active" : ""}`}
          onClick={() => setLocale(l.code)}
          aria-label={`Switch to ${l.code.toUpperCase()}`}
          aria-current={locale === l.code ? "true" : undefined}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
