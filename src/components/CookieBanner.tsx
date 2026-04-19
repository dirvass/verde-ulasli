import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { readConsent, writeConsent } from "../analytics";

export default function CookieBanner() {
  const { t } = useLanguage();
  const [decision, setDecision] = useState<"accepted" | "rejected" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDecision(readConsent());
    const tm = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(tm);
  }, []);

  if (decision !== null) return null;

  const accept = () => { writeConsent("accepted"); setDecision("accepted"); };
  const reject = () => { writeConsent("rejected"); setDecision("rejected"); };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("cookies.aria")}
      className={`cookie-banner ${mounted ? "cookie-banner--in" : ""}`}
    >
      <div className="cookie-banner__brand">VERDE · ULAŞLI</div>
      <p className="cookie-banner__body">
        {t("cookies.body")}{" "}
        <Link to="/cookies" className="cookie-banner__link">{t("cookies.learnMore")}</Link>
      </p>
      <div className="cookie-banner__actions">
        <button type="button" className="cookie-banner__btn cookie-banner__btn--primary" onClick={accept}>
          {t("cookies.accept")}
        </button>
        <button type="button" className="cookie-banner__btn cookie-banner__btn--ghost" onClick={reject}>
          {t("cookies.reject")}
        </button>
      </div>
    </div>
  );
}
