import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useLanguage } from "./i18n/LanguageContext";
import { usePageMeta } from "./hooks/usePageMeta";
import { fetchManifest } from "./galleryStore";
import { DEFAULT_MANIFEST } from "./data/galleryManifest";
import type { GalleryItem, Category } from "./data/galleryTypes";
import "./styles/GalleryPage.css";

const CAT_LABEL_KEYS: Record<Category, string> = {
  exterior: "gallery.exterior",
  interior: "gallery.interior",
  construction: "gallery.construction",
};
const CAT_DESC_KEYS: Record<Category, string> = {
  exterior: "gallery.extDesc",
  interior: "gallery.intDesc",
  construction: "gallery.conDesc",
};

function MediaThumb({ item }: { item: GalleryItem }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="gallery-card__err" aria-hidden="true">
        <span>—</span>
      </div>
    );
  }
  if (item.type === "image") {
    return <img className="gallery-card__img" src={item.src} alt={item.caption} loading="lazy" onError={() => setErrored(true)} />;
  }
  // For videos with a poster, render a lightweight <img> thumbnail instead
  // of a <video> element. iOS Safari is unreliable about painting the poster
  // on a muted preload=metadata <video>, which made mobile cards look empty.
  if (item.poster) {
    return <img className="gallery-card__img" src={item.poster} alt={item.caption} loading="lazy" onError={() => setErrored(true)} />;
  }
  return (
    <video
      className="gallery-card__img"
      src={item.src}
      muted
      preload="metadata"
      playsInline
      onError={() => setErrored(true)}
    />
  );
}

function GalleryCard({ item, idx, onOpen }: { item: GalleryItem; idx: number; onOpen: (id: string) => void }) {
  const isFeatured = item.front === "big";
  return (
    <article
      className={`gallery-card ${isFeatured ? "gallery-card--featured" : ""}`}
      onClick={() => onOpen(item.id)}
      tabIndex={0}
      role="button"
      aria-label={item.caption}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item.id); }
      }}
      style={{ animationDelay: `${idx * 0.06}s` }}
    >
      <MediaThumb item={item} />
      <div className="gallery-card__overlay">
        <span className="gallery-card__alt">
          {item.type === "video" && <span className="gallery-card__play" aria-hidden="true">&#9654;</span>}
          {item.caption}
        </span>
      </div>
    </article>
  );
}

type FilterTab = "all" | Category;

export default function GalleryPage() {
  usePageMeta("meta.galleryTitle", "meta.galleryDesc");
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<GalleryItem[]>(DEFAULT_MANIFEST.items);

  const urlCat = (searchParams.get("cat") ?? "all") as FilterTab;
  const urlId = searchParams.get("i");

  const [activeTab, setActiveTabState] = useState<FilterTab>(
    (["all", "exterior", "interior", "construction"] as FilterTab[]).includes(urlCat) ? urlCat : "all"
  );
  const [activeId, setActiveIdState] = useState<string | null>(urlId);
  const [heroVisible, setHeroVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const lightboxRef = useRef<HTMLDivElement | null>(null);

  // Load the live manifest; falls back to DEFAULT_MANIFEST on any error.
  useEffect(() => {
    let alive = true;
    fetchManifest().then((m) => { if (alive) setItems(m.items); });
    return () => { alive = false; };
  }, []);

  // Sync URL <-> state without clobbering other params
  const setActiveTab = useCallback((tab: FilterTab) => {
    setActiveTabState(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "all") next.delete("cat"); else next.set("cat", tab);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    const next = new URLSearchParams(searchParams);
    if (id) next.set("i", id); else next.delete("i");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const tm = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(tm);
  }, []);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((m) => m.category === activeTab);
  }, [activeTab, items]);

  const activeIndex = useMemo(
    () => (activeId ? filteredItems.findIndex((i) => i.id === activeId) : -1),
    [activeId, filteredItems],
  );

  const open = (id: string) => {
    openerRef.current = document.activeElement as HTMLElement;
    setActiveId(id);
    // Show the keyboard hint once per session
    try {
      if (!sessionStorage.getItem("verde-gal-hint")) {
        setShowHint(true);
        sessionStorage.setItem("verde-gal-hint", "1");
        setTimeout(() => setShowHint(false), 4000);
      }
    } catch { /* swallow */ }
  };

  const close = useCallback(() => {
    setActiveId(null);
    // Restore focus to the opener
    setTimeout(() => openerRef.current?.focus?.(), 0);
  }, [setActiveId]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (activeIndex < 0) return;
      const next = (activeIndex + dir + filteredItems.length) % filteredItems.length;
      setActiveId(filteredItems[next].id);
    },
    [activeIndex, filteredItems, setActiveId],
  );

  // Keyboard nav + focus trap inside lightbox
  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); return; }
      if (e.key === "Tab") {
        // Trap focus in the lightbox
        const root = lightboxRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    // Prevent body scroll while lightbox open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Initial focus into the lightbox close button
    setTimeout(() => {
      lightboxRef.current?.querySelector<HTMLButtonElement>(".gal-lightbox__close")?.focus();
    }, 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeId, go, close]);

  // Touch swipe
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;
    touchRef.current = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
    }
  };

  // Category sections shown below the opener in the "all" view.
  const categories: Category[] = ["interior", "exterior", "construction"];

  // Curated mixed opening for the "all" view — every item the owner has marked
  // for the front ("big" or "small"), in manifest order.
  const showcaseItems = useMemo(
    () => items.filter((i) => i.front !== "off"),
    [items],
  );

  // "View all" should also scroll to top so the tab-change lands visually
  const viewAll = (cat: Category) => {
    setActiveTab(cat);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentMedia = activeIndex >= 0 ? filteredItems[activeIndex] : null;
  const [mediaErrored, setMediaErrored] = useState(false);
  useEffect(() => { setMediaErrored(false); }, [activeId]);

  const counts = useMemo(() => {
    const c: Record<Category, number> = { interior: 0, exterior: 0, construction: 0 };
    for (const m of items) c[m.category]++;
    return c;
  }, [items]);

  return (
    <>
      {/* ── HERO ── */}
      <header className={`gallery-hero ${heroVisible ? "gallery-hero--visible" : ""}`}>
        <div className="gallery-hero__bg" aria-hidden="true" />
        <div className="gallery-hero__overlay" aria-hidden="true" />
        <TopNav />
        <div className="gallery-hero__content">
          <span className="gallery-hero__badge">{t("gallery.badge")}</span>
          <h1 className="gallery-hero__title">{t("gallery.title")}</h1>
          <div className="gallery-hero__line" />
          <p className="gallery-hero__subtitle">{t("gallery.subtitle")}</p>
        </div>
      </header>

      {/* ── FILTER TABS ── */}
      <nav className="gallery-tabs" aria-label="Gallery filter">
        <div className="gallery-tabs__inner">
          {(["all", ...categories] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`gallery-tab ${activeTab === tab ? "gallery-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
            >
              {tab === "all" ? t("gallery.all") : t(CAT_LABEL_KEYS[tab])}
              <span className="gallery-tab__count">
                {tab === "all" ? items.length : counts[tab]}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <main className="gallery-main">
        {activeTab === "all" ? (
          <>
            {/* Curated opening — mix of exterior heroes and interior rooms */}
            {showcaseItems.length > 0 && (
              <section className="gallery-section">
                <div className="gallery-section__header">
                  <div>
                    <h2 className="gallery-section__title">{t("gallery.highlights")}</h2>
                    <p className="gallery-section__desc">{t("gallery.highlightsDesc")}</p>
                  </div>
                </div>
                <div className="gallery-grid">
                  {showcaseItems.map((item, idx) => (
                    <GalleryCard key={`show-${item.id}`} item={item} idx={idx} onOpen={open} />
                  ))}
                </div>
              </section>
            )}
            {categories.map((cat) => {
              const catItems = items.filter((m) => m.category === cat);
              if (catItems.length === 0) return null;
              return (
                <section key={cat} className="gallery-section">
                  <div className="gallery-section__header">
                    <div>
                      <h2 className="gallery-section__title">{t(CAT_LABEL_KEYS[cat])}</h2>
                      <p className="gallery-section__desc">{t(CAT_DESC_KEYS[cat])}</p>
                    </div>
                    <button
                      type="button"
                      className="gallery-section__link"
                      onClick={() => viewAll(cat)}
                    >
                      {t("gallery.viewAll", { n: catItems.length })}
                    </button>
                  </div>
                  <div className={`gallery-grid ${cat === "construction" ? "gallery-grid--compact" : ""}`}>
                    {catItems.map((item, idx) => (
                      <GalleryCard key={item.id} item={item} idx={idx} onOpen={open} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          <section className="gallery-section">
            <div className="gallery-section__header">
              <div>
                <h2 className="gallery-section__title">{t(CAT_LABEL_KEYS[activeTab])}</h2>
                <p className="gallery-section__desc">{t(CAT_DESC_KEYS[activeTab])}</p>
              </div>
            </div>
            <div className={`gallery-grid ${activeTab === "construction" ? "gallery-grid--compact" : ""}`}>
              {filteredItems.map((item, idx) => (
                <GalleryCard key={item.id} item={item} idx={idx} onOpen={open} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── LIGHTBOX ── */}
      {currentMedia && (
        <div
          className="gal-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={currentMedia.caption}
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          ref={lightboxRef}
        >
          <button type="button" className="gal-lightbox__close" aria-label={t("gallery.close")} onClick={close}>
            &times;
          </button>
          <button
            type="button"
            className="gal-lightbox__nav gal-lightbox__nav--prev"
            aria-label={t("gallery.prev")}
            onClick={(e) => { e.stopPropagation(); go(-1); }}
          >
            &#8249;
          </button>
          <button
            type="button"
            className="gal-lightbox__nav gal-lightbox__nav--next"
            aria-label={t("gallery.next")}
            onClick={(e) => { e.stopPropagation(); go(1); }}
          >
            &#8250;
          </button>

          <div className="gal-lightbox__inner" onClick={(e) => e.stopPropagation()}>
            {mediaErrored ? (
              <div className="gal-lightbox__err" role="status">
                <span className="gal-lightbox__err-mark" aria-hidden="true">—</span>
                <span className="gal-lightbox__err-text">{t("gallery.mediaErr")}</span>
              </div>
            ) : currentMedia.type === "image" ? (
              <img
                key={currentMedia.id}
                className="gal-lightbox__media"
                src={currentMedia.src}
                alt={currentMedia.caption}
                onError={() => setMediaErrored(true)}
              />
            ) : (
              <video
                key={currentMedia.id}
                className="gal-lightbox__media"
                src={currentMedia.src}
                controls
                autoPlay
                muted
                playsInline
                preload="metadata"
                onError={() => setMediaErrored(true)}
              />
            )}
            <div className="gal-lightbox__caption">
              <span className="gal-lightbox__caption-cat">
                {t(CAT_LABEL_KEYS[currentMedia.category])}
              </span>
              <span>{currentMedia.caption}</span>
            </div>
            <div className="gal-lightbox__counter tnum">
              {activeIndex + 1} / {filteredItems.length}
            </div>
          </div>

          {showHint && (
            <div className="gal-lightbox__hint" role="status" aria-live="polite">
              {t("gallery.hint")}
            </div>
          )}
        </div>
      )}
    </>
  );
}
