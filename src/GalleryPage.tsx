import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useLanguage } from "./i18n/LanguageContext";
import { usePageMeta } from "./hooks/usePageMeta";
import "./styles/GalleryPage.css";

type Media =
  | { id: string; type: "image"; src: string; alt: string; category: Category; featured?: boolean }
  | { id: string; type: "video"; src: string; poster?: string; alt: string; category: Category };

type Category = "exterior" | "interior" | "construction";

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

const MEDIA: Media[] = [
  // ─── EXTERIOR ───
  { id: "ext-havuz-deniz", type: "image", src: "/media/dis-mekan/havuz-deniz-manzarasi-konsept.jpg", alt: "Infinity pool with sea panorama", category: "exterior", featured: true },

  { id: "ext2-bahce-patika", type: "image", src: "/media/dis-mekan/bahce-peyzaj-patika-gunduz-render.jpg", alt: "Garden landscape with pathways", category: "exterior", featured: true },
  { id: "ext2-havuz-satranc-sauna", type: "image", src: "/media/dis-mekan/havuz-satranc-sauna-gunduz-render.jpg", alt: "Pool, chess garden & sauna pavilion", category: "exterior", featured: true },
  { id: "ext2-on-cephe-mangal", type: "image", src: "/media/dis-mekan/on-cephe-havuz-mangal-gunduz-render.jpg", alt: "Front facade with pool & outdoor kitchen", category: "exterior" },
  { id: "ext2-sauna-jakuzi-gece", type: "image", src: "/media/dis-mekan/sauna-jakuzi-gece-render-v2.jpg", alt: "Sauna cabin & jacuzzi terrace — night", category: "exterior" },
  { id: "ext2-kus-bakisi-deniz", type: "image", src: "/media/dis-mekan/kus-bakisi-deniz-gunduz-render.jpg", alt: "Bird's eye with sea view", category: "exterior" },
  { id: "ext2-giris-deniz-golden", type: "image", src: "/media/dis-mekan/giris-avlusu-deniz-golden-hour-render.jpg", alt: "Entrance courtyard — golden hour, sea view", category: "exterior" },
  { id: "ext2-giris-yolu-golden", type: "image", src: "/media/dis-mekan/giris-yolu-deniz-golden-hour-render.jpg", alt: "Arrival drive — golden hour, sea backdrop", category: "exterior" },
  { id: "ext2-havuz-mutfak-yakin", type: "image", src: "/media/dis-mekan/on-cephe-havuz-mutfak-yakin-render.jpg", alt: "Pool & outdoor kitchen close-up", category: "exterior" },
  { id: "ext2-havuz-teras-gunbatimi", type: "image", src: "/media/dis-mekan/havuz-teras-deniz-gunbatimi-render.jpg", alt: "Pool terrace at sunset with sea view", category: "exterior" },
  { id: "ext2-bahce-havuz-kus", type: "image", src: "/media/dis-mekan/bahce-havuz-sauna-kus-bakisi-render.jpg", alt: "Garden overview — pool & sauna from above", category: "exterior" },
  { id: "ext2-giris-zeytin", type: "image", src: "/media/dis-mekan/giris-avlusu-zeytin-agaci-render.jpg", alt: "Entrance courtyard with olive tree", category: "exterior" },
  { id: "ext2-satranc-patika", type: "image", src: "/media/dis-mekan/satranc-alani-bahce-patika-render.jpg", alt: "Chess area with garden pathways", category: "exterior" },

  // ─── EXTERIOR — PREVIOUS RENDERS ───
  { id: "vid-yayla", type: "video", src: "/media/videolar/kuzu-yayla.mp4", poster: "/media/videolar/kuzu-yayla-poster.jpg", alt: "Kuzu Yayla — highland meadows and mountain views", category: "construction" },
  { id: "ext-kus-bakisi-gunduz", type: "image", src: "/media/dis-mekan/kus-bakisi-gunduz-ai-render.jpg", alt: "Aerial view — daytime", category: "exterior", featured: true },
  { id: "ext-on-cephe-ates", type: "image", src: "/media/dis-mekan/on-cephe-ates-cukuru-render.jpg", alt: "Front facade with fire pit", category: "exterior", featured: true },
  { id: "ext-drone-genel", type: "image", src: "/media/dis-mekan/drone-genel-gorunum-render.jpg", alt: "Drone overview of the estate", category: "exterior" },
  { id: "ext-giris-gece", type: "image", src: "/media/dis-mekan/giris-avlusu-gece-ai-render.jpg", alt: "Entrance courtyard — evening", category: "exterior" },
  { id: "ext-giris-peyzaj", type: "image", src: "/media/dis-mekan/giris-yolu-peyzaj-render.jpg", alt: "Landscaped entrance pathway", category: "exterior" },
  { id: "ext-kus-bakisi-gece", type: "image", src: "/media/dis-mekan/kus-bakisi-gece-ai-render.jpg", alt: "Aerial view — night", category: "exterior" },
  { id: "ext-yan-cephe", type: "image", src: "/media/dis-mekan/yan-cephe-genel-gorunum-render.jpg", alt: "Side view — full estate", category: "exterior" },

  // ─── INTERIOR RENDERS (ic-mekan) ───
  { id: "int-salon-deniz", type: "image", src: "/media/ic-mekan/salon-deniz-manzarasi-render.jpg", alt: "Living room with sea view", category: "interior", featured: true },
  { id: "int-yatak-banyo", type: "image", src: "/media/ic-mekan/yatak-odasi-banyolu-manzara-render.jpg", alt: "Master bedroom with en-suite bath", category: "interior", featured: true },
  { id: "int-mutfak", type: "image", src: "/media/ic-mekan/mutfak-ada-tezgah-render.jpg", alt: "Kitchen with island counter", category: "interior" },
  { id: "int-salon-somine", type: "image", src: "/media/ic-mekan/salon-somine-kahverengi-koltuk-render.jpg", alt: "Lounge with fireplace", category: "interior" },
  { id: "int-salon-manzara", type: "image", src: "/media/ic-mekan/salon-somine-manzara-render.jpg", alt: "Salon with fireplace and panoramic view", category: "interior" },
  { id: "int-yatak-minimalist", type: "image", src: "/media/ic-mekan/yatak-odasi-genis-minimalist-render.jpg", alt: "Minimalist bedroom suite", category: "interior" },
  { id: "int-yatak-yesil", type: "image", src: "/media/ic-mekan/yatak-odasi-yesil-dus-render.png", alt: "Bedroom with walk-in shower", category: "interior" },

  // ─── CONSTRUCTION PROCESS (insaat-sureci) ───
  // New site-visit videos lead the section for prominence.
  { id: "vid-villa-zeytin-deniz", type: "video", src: "/media/videolar/insaat-villa-zeytin-deniz.mp4", poster: "/media/videolar/insaat-villa-zeytin-deniz-poster.jpg", alt: "Villa shell with olive tree and sea view", category: "construction" },
  { id: "vid-arazi-zeytin", type: "video", src: "/media/videolar/insaat-arazi-zeytin.mp4", poster: "/media/videolar/insaat-arazi-zeytin-poster.jpg", alt: "Walking the land — olive trees and terraced grounds", category: "construction" },
  { id: "vid-cevre-manzara", type: "video", src: "/media/videolar/insaat-cevre-manzara.mp4", poster: "/media/videolar/insaat-cevre-manzara-poster.jpg", alt: "Forested slopes and Marmara panorama from the site", category: "construction" },
  { id: "con-on-cephe-deniz", type: "image", src: "/media/insaat-sureci/insaat-on-cephe-deniz-manzarasi.jpg", alt: "Twin villa shells facing the sea — golden hour", category: "construction", featured: true },
  { id: "con-foto3", type: "image", src: "/media/insaat-sureci/insaat-fotograf-3.jpg", alt: "Foundation formwork with sea panorama", category: "construction", featured: true },
  { id: "con-arazi", type: "image", src: "/media/insaat-sureci/arazi-hazirligi-genel-gorunum.jpg", alt: "Site preparation — overview", category: "construction" },
  { id: "con-foto1", type: "image", src: "/media/insaat-sureci/insaat-fotograf-1.jpg", alt: "Grading and retaining wall — sea view", category: "construction" },
  { id: "con-foto2", type: "image", src: "/media/insaat-sureci/insaat-fotograf-2.jpg", alt: "Retaining wall and earthworks", category: "construction" },
  { id: "con-foto4", type: "image", src: "/media/insaat-sureci/insaat-fotograf-4.jpg", alt: "Winter view — site under snow", category: "construction" },
  { id: "con-bati-bahce", type: "image", src: "/media/insaat-sureci/bati_bahce.jpg", alt: "West garden progress", category: "construction" },
  { id: "con-bati-cephe", type: "image", src: "/media/insaat-sureci/bati_cephe.jpg", alt: "West facade structure", category: "construction" },
  { id: "con-dogu-cephe", type: "image", src: "/media/insaat-sureci/dogu_cephe.jpg", alt: "East facade structure", category: "construction" },
  { id: "con-izolasyon-once", type: "image", src: "/media/insaat-sureci/izolasyon_oncesi.jpg", alt: "Before insulation", category: "construction" },
  { id: "con-izolasyon-sonra", type: "image", src: "/media/insaat-sureci/izolasyon_sonrasi.jpg", alt: "After insulation", category: "construction" },

  // ─── VIDEOS ───
  { id: "vid-1", type: "video", src: "/media/videolar/villa-video-1.mp4", alt: "Villa site tour 1", category: "construction" },
  { id: "vid-2", type: "video", src: "/media/videolar/villa-video-2.mp4", alt: "Villa site tour 2", category: "construction" },
  { id: "vid-3", type: "video", src: "/media/videolar/villa-video-3.mp4", poster: "/media/videolar/villa-video-3-poster.jpg", alt: "Villa interior walkthrough", category: "interior" },
  { id: "vid-4", type: "video", src: "/media/videolar/villa-video-4.mp4", poster: "/media/videolar/villa-video-4-poster.jpg", alt: "Construction progress walkthrough", category: "construction" },
];

function MediaThumb({ item }: { item: Media }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="gallery-card__err" aria-hidden="true">
        <span>—</span>
      </div>
    );
  }
  if (item.type === "image") {
    return <img className="gallery-card__img" src={item.src} alt={item.alt} loading="lazy" onError={() => setErrored(true)} />;
  }
  return (
    <video
      className="gallery-card__img"
      src={item.src}
      poster={"poster" in item ? item.poster : undefined}
      muted
      preload="metadata"
      playsInline
      onError={() => setErrored(true)}
    />
  );
}

function GalleryCard({ item, idx, onOpen }: { item: Media; idx: number; onOpen: (id: string) => void }) {
  const isFeatured = item.type === "image" && "featured" in item && item.featured;
  return (
    <article
      className={`gallery-card ${isFeatured ? "gallery-card--featured" : ""}`}
      onClick={() => onOpen(item.id)}
      tabIndex={0}
      role="button"
      aria-label={item.alt}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item.id); }
      }}
      style={{ animationDelay: `${idx * 0.06}s` }}
    >
      <MediaThumb item={item} />
      <div className="gallery-card__overlay">
        <span className="gallery-card__alt">
          {item.type === "video" && <span className="gallery-card__play" aria-hidden="true">&#9654;</span>}
          {item.alt}
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

  const urlCat = (searchParams.get("cat") ?? "all") as FilterTab;
  const urlId = searchParams.get("i");

  const [activeTab, setActiveTabState] = useState<FilterTab>(
    (["all", "exterior", "interior", "construction"] as FilterTab[]).includes(urlCat) ? urlCat : "all"
  );
  const [activeId, setActiveIdState] = useState<string | null>(
    urlId && MEDIA.some(m => m.id === urlId) ? urlId : null
  );
  const [heroVisible, setHeroVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const lightboxRef = useRef<HTMLDivElement | null>(null);

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
    if (activeTab === "all") return MEDIA;
    return MEDIA.filter((m) => m.category === activeTab);
  }, [activeTab]);

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

  // Group items by category for the "all" view
  const categories: Category[] = ["exterior", "interior", "construction"];

  // "View all" should also scroll to top so the tab-change lands visually
  const viewAll = (cat: Category) => {
    setActiveTab(cat);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentMedia = activeIndex >= 0 ? filteredItems[activeIndex] : null;
  const [mediaErrored, setMediaErrored] = useState(false);
  useEffect(() => { setMediaErrored(false); }, [activeId]);

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
                {tab === "all" ? MEDIA.length : MEDIA.filter((m) => m.category === tab).length}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <main className="gallery-main">
        {activeTab === "all" ? (
          categories.map((cat) => {
            const items = MEDIA.filter((m) => m.category === cat);
            if (items.length === 0) return null;
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
                    {t("gallery.viewAll", { n: items.length })}
                  </button>
                </div>
                <div className={`gallery-grid ${cat === "construction" ? "gallery-grid--compact" : ""}`}>
                  {items.map((item, idx) => (
                    <GalleryCard key={item.id} item={item} idx={idx} onOpen={open} />
                  ))}
                </div>
              </section>
            );
          })
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
          aria-label={currentMedia.alt}
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
                alt={currentMedia.alt}
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
              <span>{currentMedia.alt}</span>
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
