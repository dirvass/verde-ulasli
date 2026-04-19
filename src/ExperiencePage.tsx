import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TopNav from "./components/TopNav";
import Footer from "./components/Footer";
import { useLanguage } from "./i18n/LanguageContext";
import { usePageMeta } from "./hooks/usePageMeta";
import "./styles/ExperiencePage.css";

type SeasonTag = "allSeasons" | "springSummer" | "summerOnly";

interface Experience {
  key: string;
  img: string;
  season: SeasonTag;
}

const EXPERIENCES: Experience[] = [
  { key: "1", img: "/media/insaat-sureci/arazi-hazirligi-genel-gorunum.jpg", season: "allSeasons" },
  { key: "2", img: "/media/dis-mekan/on-cephe-ates-cukuru-render.jpg", season: "springSummer" },
  { key: "3", img: "/media/dis-mekan/giris-avlusu-gece-ai-render.jpg", season: "allSeasons" },
  { key: "4", img: "/media/dis-mekan/kus-bakisi-gece-ai-render.jpg", season: "allSeasons" },
  { key: "5", img: "/media/dis-mekan/yan-cephe-genel-gorunum-render.jpg", season: "allSeasons" },
  { key: "6", img: "/media/dis-mekan/havuz-deniz-manzarasi-konsept.jpg", season: "summerOnly" },
  { key: "7", img: "/media/dis-mekan/on-cephe-havuz-satranc-render.jpg", season: "allSeasons" },
  { key: "8", img: "/media/dis-mekan/drone-genel-gorunum-render.jpg", season: "allSeasons" },
  { key: "9", img: "/media/dis-mekan/on-cephe-ates-cukuru-render.jpg", season: "summerOnly" },
  { key: "10", img: "/media/dis-mekan/giris-yolu-peyzaj-render.jpg", season: "allSeasons" },
];

const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
type SeasonKey = (typeof SEASONS)[number];

type FilterKey = "all" | SeasonKey;

// Map availability tag → which SeasonKey it matches
function matchesSeason(tag: SeasonTag, season: SeasonKey): boolean {
  if (tag === "allSeasons") return true;
  if (tag === "springSummer") return season === "spring" || season === "summer";
  if (tag === "summerOnly") return season === "summer";
  return false;
}

export default function ExperiencePage() {
  usePageMeta("meta.experienceTitle", "meta.experienceDesc");
  const [vis, setVis] = useState(false);
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlFilter = (searchParams.get("season") ?? "all") as FilterKey;
  const [filter, setFilterState] = useState<FilterKey>(
    (["all", ...SEASONS] as FilterKey[]).includes(urlFilter) ? urlFilter : "all"
  );

  const setFilter = (f: FilterKey) => {
    setFilterState(f);
    const next = new URLSearchParams(searchParams);
    if (f === "all") next.delete("season"); else next.set("season", f);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => { const tm = setTimeout(() => setVis(true), 100); return () => clearTimeout(tm); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return EXPERIENCES;
    return EXPERIENCES.filter(e => matchesSeason(e.season, filter));
  }, [filter]);

  return (
    <>
      {/* ═══ HERO ═══ */}
      <header className={`exp-hero ${vis ? "exp-hero--vis" : ""}`}>
        <div className="exp-hero__bg" aria-hidden="true" />
        <div className="exp-hero__ov" aria-hidden="true" />
        <TopNav />
        <div className="exp-hero__ct">
          <span className="exp-hero__badge">{t("experience.badge")}</span>
          <h1 className="exp-hero__title">{t("experience.heroTitle")}</h1>
          <div className="exp-hero__line" />
          <p className="exp-hero__sub">{t("experience.heroSub")}</p>
        </div>
      </header>

      <main className="exp-page">
        {/* ═══ SEASONAL FILTER ═══ */}
        <nav className="exp-filter" aria-label={t("experience.filterAria")}>
          {(["all", ...SEASONS] as FilterKey[]).map(f => (
            <button
              key={f}
              type="button"
              className={`exp-filter__tab ${filter === f ? "exp-filter__tab--active" : ""}`}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
            >
              {f === "all" ? t("experience.filterAll") : t(`experience.${f}`)}
            </button>
          ))}
        </nav>

        {/* ═══ EXPERIENCES GRID ═══ */}
        <section className="exp-page__grid-section">
          {filtered.length === 0 ? (
            <p className="exp-empty">{t("experience.emptyFilter")}</p>
          ) : (
            filtered.map((e) => (
              <article className="exp-card" key={e.key}>
                <div className="exp-card__img-wrap">
                  <img className="exp-card__img" src={e.img} alt={t(`experience.exp${e.key}`)} loading="lazy" />
                </div>
                <div className="exp-card__body">
                  <span className={`exp-card__season exp-card__season--${e.season}`}>
                    {t(`experience.${e.season}`)}
                  </span>
                  <h3 className="exp-card__title">{t(`experience.exp${e.key}`)}</h3>
                  <p className="exp-card__desc">{t(`experience.exp${e.key}d`)}</p>
                </div>
              </article>
            ))
          )}
        </section>

        {/* ═══ SEASONS ═══ */}
        <section className="exp-seasons">
          <h2 className="exp-seasons__title">{t("experience.seasonLabel")}</h2>
          <div className="exp-seasons__grid">
            {SEASONS.map((s) => (
              <div className="exp-season" key={s}>
                <h3 className="exp-season__name">{t(`experience.${s}`)}</h3>
                <p className="exp-season__desc">{t(`experience.${s}Desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="exp-cta-section">
          <h2 className="exp-cta__title">{t("home.closingTitle")}</h2>
          <p className="exp-cta__body">{t("home.closingBody")}</p>
          <Link to="/book" className="exp-cta__btn">{t("home.closingCta")}</Link>
        </section>
      </main>

      <Footer />
    </>
  );
}
