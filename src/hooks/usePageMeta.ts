import { useEffect } from "react";
import { useLanguage, Locale } from "../i18n/LanguageContext";

const OG_IMAGE = "/media/dis-mekan/kus-bakisi-gunduz-ai-render.jpg";
const SITE_ORIGIN = "https://verde-ulasli.com";

const LOCALE_MAP: Record<Locale, string> = {
  en: "en_US",
  tr: "tr_TR",
  de: "de_DE",
  ar: "ar_SA",
};

const HREFLANG_MAP: Record<Locale, string> = {
  en: "en",
  tr: "tr",
  de: "de",
  ar: "ar",
};

const SUPPORTED_LOCALES: Locale[] = ["en", "tr", "de", "ar"];

const JSON_LD_ID = "verde-ld";

/** Set or create a <meta> tag. Both arg values are code-controlled. */
function setMeta(attr: "name" | "property", value: string, content: string) {
  const selector = `meta[${attr}="${CSS.escape(value)}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(payload: object) {
  let el = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = JSON_LD_ID;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

function removeJsonLd() {
  document.getElementById(JSON_LD_ID)?.remove();
}

/**
 * Sets document.title and SEO / Open Graph meta tags using translated strings.
 * Emits canonical + hreflang + JSON-LD LodgingBusiness. Cleans up on unmount.
 *
 * NOTE: social scrapers (WhatsApp/LinkedIn/Twitter) do not execute JS and
 * will only read tags baked into index.html. Per-route cards require server-
 * side rendering or a Cloudflare Pages Function / HTML Rewriter.
 */
export function usePageMeta(titleKey: string, descKey: string) {
  const { t, locale } = useLanguage();

  useEffect(() => {
    const title = t(titleKey);
    const desc = t(descKey);
    const pathname = window.location.pathname;
    const canonicalUrl = `${SITE_ORIGIN}${pathname}`;

    document.title = title;

    setMeta("name", "description", desc);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", `${SITE_ORIGIN}${OG_IMAGE}`);
    setMeta("property", "og:locale", LOCALE_MAP[locale] ?? "en_US");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", `${SITE_ORIGIN}${OG_IMAGE}`);

    setCanonical(canonicalUrl);

    // hreflang alternates
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    for (const loc of SUPPORTED_LOCALES) {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = HREFLANG_MAP[loc];
      link.href = `${SITE_ORIGIN}${pathname}?lang=${loc}`;
      document.head.appendChild(link);
    }
    const xdef = document.createElement("link");
    xdef.rel = "alternate";
    xdef.hreflang = "x-default";
    xdef.href = canonicalUrl;
    document.head.appendChild(xdef);

    // LodgingBusiness structured data
    setJsonLd({
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      name: "VERDE Ulaşlı",
      url: SITE_ORIGIN,
      image: `${SITE_ORIGIN}${OG_IMAGE}`,
      description: desc,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Ulaşlı",
        addressRegion: "Kocaeli",
        addressCountry: "TR",
      },
      priceRange: "€€€",
      numberOfRooms: 6,
      petsAllowed: false,
      amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Infinity pool", value: true },
        { "@type": "LocationFeatureSpecification", name: "Organic garden", value: true },
        { "@type": "LocationFeatureSpecification", name: "Sauna", value: true },
        { "@type": "LocationFeatureSpecification", name: "Private estate", value: true },
      ],
    });

    return () => {
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
      removeJsonLd();
      document.title = "VERDE Ulaşlı — Agro-Luxury Villa Estate";
      setMeta("name", "description", "Turkey's first agro-luxury villa estate. Two private villas on 5,500 m² of living land in Kocaeli.");
      setMeta("property", "og:title", "VERDE Ulaşlı — Agro-Luxury Villa Estate");
      setMeta("property", "og:description", "Turkey's first agro-luxury villa estate. Two private villas on 5,500 m² of living land in Kocaeli.");
      setMeta("property", "og:locale", "en_US");
    };
  }, [t, titleKey, descKey, locale]);
}
