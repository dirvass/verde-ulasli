import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "./components/TopNav";
import Footer from "./components/Footer";
import LocationMap from "./components/LocationMap";
import { useLanguage } from "./i18n/LanguageContext";
import { usePageMeta } from "./hooks/usePageMeta";
import "./styles/Home.css";

const EXPERIENCES = [
  { key: "1", img: "/media/insaat-sureci/arazi-hazirligi-genel-gorunum.jpg" },
  { key: "2", img: "/media/dis-mekan/on-cephe-ates-cukuru-render.jpg" },
  { key: "3", img: "/media/dis-mekan/giris-avlusu-gece-ai-render.jpg" },
  { key: "4", img: "/media/dis-mekan/kus-bakisi-gece-ai-render.jpg" },
];

const DISTANCES = [
  { key: "locOsmangazi", min: "15" },
  { key: "locAirport", min: "40" },
  { key: "locIstanbul", min: "50" },
  { key: "locBursa", min: "50" },
];

export default function Home() {
  usePageMeta("meta.homeTitle", "meta.homeDesc");
  const [visible, setVisible] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    const onScroll = () => {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setShowStickyCta(h > 0 && y / h > 0.4);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const scrollToAgro = () => {
    document.getElementById("home-agro")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* ═══ HERO ═══ */}
      <header className={`home-hero ${visible ? "home-hero--visible" : ""}`}>
        <div className="home-hero__bg" aria-hidden="true" />
        <div className="home-hero__overlay" aria-hidden="true" />
        <TopNav />
        <div className="home-hero__content">
          <span className="home-hero__badge">{t("home.badge")}</span>
          <h1 className="home-hero__title">{t("home.title")}</h1>
          <p className="home-hero__tagline">{t("home.tagline")}</p>
          <div className="home-hero__divider" />
          <p className="home-hero__subtitle">{t("home.subtitle")}</p>
        </div>
        <button
          type="button"
          className="home-hero__scroll"
          onClick={scrollToAgro}
          aria-label={t("home.scroll")}
        >
          <span>{t("home.scroll")}</span>
          <div className="home-hero__scroll-line" aria-hidden="true" />
        </button>
      </header>

      {/* ═══ FEATURES STRIP ═══ */}
      <section className={`home-features ${visible ? "home-features--visible" : ""}`}>
        <div className="home-features__grid">
          <div className="home-features__item">
            <span className="home-features__number tnum">5 500&nbsp;m&sup2;</span>
            <span className="home-features__label">{t("home.garden")}</span>
          </div>
          <div className="home-features__divider" />
          <div className="home-features__item">
            <span className="home-features__number tnum">10 × 5&nbsp;m</span>
            <span className="home-features__label">{t("home.pool")}</span>
          </div>
          <div className="home-features__divider" />
          <div className="home-features__item">
            <span className="home-features__number tnum">3</span>
            <span className="home-features__label">{t("home.bedrooms")}</span>
          </div>
          <div className="home-features__divider" />
          <div className="home-features__item">
            <span className="home-features__number tnum">12</span>
            <span className="home-features__label">{t("home.guests")}</span>
          </div>
        </div>
      </section>

      {/* ═══ AGRO-LUXURY ═══ */}
      <section className="home-agro" id="home-agro">
        <div className="home-agro__inner">
          <div className="home-agro__img-wrap">
            <img
              className="home-agro__img"
              src="/media/dis-mekan/drone-genel-gorunum-render.jpg"
              alt="Verde Ulasli estate aerial"
              loading="lazy"
            />
          </div>
          <div className="home-agro__text">
            <span className="home-section-label">{t("home.agroLabel")}</span>
            <h2 className="home-section-title">{t("home.agroTitle")}</h2>
            <div className="home-section-divider" />
            <p className="home-section-body">{t("home.agroBody")}</p>
            <span className="home-section-detail">{t("home.agroDetail")}</span>
          </div>
        </div>
      </section>

      {/* ═══ TWO VILLAS ═══ */}
      <section className="home-villas">
        <div className="home-villas__head">
          <span className="home-section-label">{t("home.villasLabel")}</span>
          <h2 className="home-section-title">{t("home.villasTitle")}</h2>
        </div>
        <div className="home-villas__grid">
          <Link to="/book" className="home-villa-card">
            <img className="home-villa-card__img" src="/media/dis-mekan/kus-bakisi-gunduz-ai-render.jpg" alt="ALYA" loading="lazy" />
            <div className="home-villa-card__overlay" />
            <div className="home-villa-card__content">
              <h3 className="home-villa-card__name">{t("home.alyaName")}</h3>
              <p className="home-villa-card__desc">{t("home.alyaDesc")}</p>
              <span className="home-villa-card__meta tnum">{t("booking.sleeps", { n: 8 })}</span>
            </div>
          </Link>
          <Link to="/book" className="home-villa-card">
            <img className="home-villa-card__img" src="/media/dis-mekan/havuz-deniz-manzarasi-konsept.jpg" alt="ZEHRA" loading="lazy" />
            <div className="home-villa-card__overlay" />
            <div className="home-villa-card__content">
              <h3 className="home-villa-card__name">{t("home.zehraName")}</h3>
              <p className="home-villa-card__desc">{t("home.zehraDesc")}</p>
              <span className="home-villa-card__meta tnum">{t("booking.sleeps", { n: 6 })}</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ═══ EXPERIENCES ═══ */}
      <section className="home-exp">
        <div className="home-exp__text">
          <span className="home-section-label">{t("home.expLabel")}</span>
          <h2 className="home-section-title">{t("home.expTitle")}</h2>
          <div className="home-section-divider" />
          <p className="home-section-body">{t("home.expBody")}</p>
        </div>
        <div className="home-exp__grid">
          {EXPERIENCES.map((e) => (
            <div className="home-exp-card" key={e.key}>
              <img className="home-exp-card__img" src={e.img} alt={t(`home.exp${e.key}`)} loading="lazy" />
              <div className="home-exp-card__overlay" />
              <div className="home-exp-card__content">
                <h4 className="home-exp-card__name">{t(`home.exp${e.key}`)}</h4>
                <p className="home-exp-card__desc">{t(`home.exp${e.key}d`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ LOCATION PARADOX ═══ */}
      <section className="home-loc">
        <div className="home-loc__inner">
          <span className="home-section-label">{t("home.locLabel")}</span>
          <h2 className="home-section-title">{t("home.locTitle")}</h2>
          <div className="home-section-divider" style={{ margin: "20px auto" }} />
          <div className="home-loc__grid">
            {DISTANCES.map((d) => (
              <div className="home-loc__item" key={d.key}>
                <span className="home-loc__min">{d.min}<small>min</small></span>
                <span className="home-loc__place">{t(`home.${d.key}`)}</span>
              </div>
            ))}
          </div>
          <LocationMap />
        </div>
      </section>

      {/* ═══ CLOSING CTA ═══ */}
      <section className="home-closing">
        <div className="home-closing__bg" aria-hidden="true" />
        <div className="home-closing__overlay" aria-hidden="true" />
        <div className="home-closing__content">
          <h2 className="home-closing__title">{t("home.closingTitle")}</h2>
          <div className="home-section-divider" style={{ margin: "16px auto", background: "var(--gold,#C3A564)" }} />
          <p className="home-closing__body">{t("home.closingBody")}</p>
          <Link to="/book" className="home-closing__cta">{t("home.closingCta")}</Link>
        </div>
      </section>

      <Footer />

      <Link
        to="/book"
        className={`home-sticky-cta ${showStickyCta ? "home-sticky-cta--show" : ""}`}
        aria-hidden={!showStickyCta}
        tabIndex={showStickyCta ? 0 : -1}
      >
        {t("home.ctaReserve")}
      </Link>
    </>
  );
}
