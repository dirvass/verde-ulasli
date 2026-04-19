import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

const NAV = [
  { href: "/", key: "nav.home" },
  { href: "/story", key: "nav.story" },
  { href: "/experience", key: "nav.experience" },
  { href: "/gallery", key: "nav.gallery" },
  { href: "/book", key: "nav.booking" },
];

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <span className="site-footer__logo">VERDE ULAŞLI</span>
          <p className="site-footer__tagline">{t("footer.tagline")}</p>
          <a
            href="https://www.instagram.com/verde.ulasli"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer__social"
            aria-label="Instagram"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            <span>@verde.ulasli</span>
          </a>
        </div>
        <div className="site-footer__col">
          <h4 className="site-footer__heading">{t("footer.nav")}</h4>
          <nav className="site-footer__nav">
            {NAV.map((l) => (
              <Link key={l.href} to={l.href} className="site-footer__link">{t(l.key)}</Link>
            ))}
          </nav>
        </div>
        <div className="site-footer__col">
          <h4 className="site-footer__heading">{t("footer.contact")}</h4>
          <a href={`mailto:${t("footer.email")}`} className="site-footer__link">{t("footer.email")}</a>
          <a href={`tel:${t("footer.phone").replace(/\s/g, "")}`} className="site-footer__link">{t("footer.phone")}</a>
          <span className="site-footer__link">{t("footer.hours")}</span>
          <span className="site-footer__link">{t("footer.location")}</span>
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>{t("footer.copy")}</span>
        <span className="site-footer__legal">
          <Link to="/privacy" className="site-footer__link">{t("privacy.title")}</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/cookies" className="site-footer__link">{t("cookies.title")}</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/terms" className="site-footer__link">{t("terms.title")}</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/impressum" className="site-footer__link">{t("impressum.title")}</Link>
        </span>
      </div>
    </footer>
  );
}
