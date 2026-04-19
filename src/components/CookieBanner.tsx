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
    const onLoad = () => setMounted(true);
    const tm = setTimeout(onLoad, 400);
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
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        maxWidth: 560,
        marginLeft: "auto",
        background: "#0E1A16",
        color: "#EBE8E1",
        border: "1px solid rgba(195,165,100,0.25)",
        borderRadius: 8,
        padding: "16px 18px",
        fontFamily: "Inter, -apple-system, Segoe UI, sans-serif",
        fontSize: 13,
        lineHeight: 1.5,
        zIndex: 9999,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        transform: mounted ? "translateY(0)" : "translateY(12px)",
        opacity: mounted ? 1 : 0,
        transition: "opacity 240ms ease, transform 240ms ease",
      }}
    >
      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#C3A564", letterSpacing: 4, fontSize: 10, marginBottom: 6, textTransform: "uppercase" }}>
        VERDE · ULAŞLI
      </div>
      <p style={{ margin: 0, color: "rgba(235,232,225,0.82)" }}>
        {t("cookies.body")}{" "}
        <Link to="/cookies" style={{ color: "#C3A564", textDecoration: "underline" }}>{t("cookies.learnMore")}</Link>
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button
          onClick={accept}
          style={{
            background: "#C3A564",
            color: "#0E1A16",
            border: "none",
            padding: "9px 18px",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: 3,
          }}
        >{t("cookies.accept")}</button>
        <button
          onClick={reject}
          style={{
            background: "transparent",
            color: "#C3A564",
            border: "1px solid rgba(195,165,100,0.6)",
            padding: "9px 18px",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: 3,
          }}
        >{t("cookies.reject")}</button>
      </div>
    </div>
  );
}
