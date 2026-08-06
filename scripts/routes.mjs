/**
 * Single source of truth for public routes.
 *
 * Consumed by scripts/prerender.mjs to emit, per route:
 *   - a static HTML file with page-specific <title>/description/OG tags
 *   - a crawler-readable content shell built from src/i18n/*.json
 *   - sitemap.xml entries
 *   - _redirects rules
 *
 * Keys reference src/i18n/<locale>.json. The strings are the same ones the
 * React pages render, so the static shell never drifts from what users see.
 *
 * Content block shapes:
 *   { h, p }                heading + paragraph
 *   { h, items: [[t, d]] }  heading + definition list
 *   { h, facts: [[k, v]] }  heading + label/value pairs (v is a literal, not a key)
 *   { h, lines: [k] }       heading + one line per key
 */

export const SITE_ORIGIN = "https://verde-ulasli.com";
export const OG_IMAGE = "/media/dis-mekan/kus-bakisi-gunduz-ai-render.jpg";
export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "tr", "de", "ar"];

/** Drive times shown on the home page (src/Home.tsx keeps the same values). */
const DRIVE_TIMES = [
  ["home.locOsmangazi", "15 min"],
  ["home.locAirport", "40 min"],
  ["home.locIstanbul", "50 min"],
  ["home.locBursa", "50 min"],
];

export const ROUTES = [
  {
    path: "/",
    titleKey: "meta.homeTitle",
    descKey: "meta.homeDesc",
    priority: "1.0",
    changefreq: "monthly",
    heading: "meta.homeTitle",
    lead: "home.subtitle",
    blocks: [
      // Same four figures as the home page features strip (src/Home.tsx:75).
      {
        h: "home.badge",
        facts: [
          ["home.garden", "5,500 m²"],
          ["home.pool", "10 × 5 m"],
          ["home.bedrooms", "3 per villa"],
          ["home.guests", "12 per villa"],
        ],
      },
      { h: "home.agroTitle", p: "home.agroBody" },
      {
        h: "home.villasTitle",
        items: [
          ["home.alyaName", "home.alyaDesc"],
          ["home.zehraName", "home.zehraDesc"],
        ],
      },
      {
        h: "home.expTitle",
        p: "home.expBody",
        items: [
          ["home.exp1", "home.exp1d"],
          ["home.exp2", "home.exp2d"],
          ["home.exp3", "home.exp3d"],
          ["home.exp4", "home.exp4d"],
        ],
      },
      { h: "home.locTitle", facts: DRIVE_TIMES },
      { h: "home.closingTitle", p: "home.closingBody" },
    ],
  },
  {
    path: "/story",
    titleKey: "meta.storyTitle",
    descKey: "meta.storyDesc",
    priority: "0.8",
    changefreq: "monthly",
    heading: "story.heroTitle",
    lead: "story.heroSub",
    blocks: [
      { h: "story.s1Title", p: "story.s1Body" },
      { h: "story.s2Title", p: "story.s2Body" },
      { h: "story.s3Title", p: "story.s3Body" },
      { h: "story.s4Title", p: "story.s4Body" },
      { h: "story.s5Title", p: "story.s5Body" },
      { h: "story.s6Title", p: "story.s6Body" },
      { h: "story.s7Title", p: "story.s7Body" },
      { h: "story.s8Title", p: "story.s8Body" },
      { h: "story.s9Title", p: "story.s9Body" },
      { h: "story.s10Title", p: "story.s10Body" },
    ],
  },
  {
    path: "/experience",
    titleKey: "meta.experienceTitle",
    descKey: "meta.experienceDesc",
    priority: "0.8",
    changefreq: "monthly",
    heading: "experience.heroTitle",
    lead: "experience.heroSub",
    blocks: [
      {
        h: "experience.seasonLabel",
        items: [
          ["experience.spring", "experience.springDesc"],
          ["experience.summer", "experience.summerDesc"],
          ["experience.autumn", "experience.autumnDesc"],
          ["experience.winter", "experience.winterDesc"],
        ],
      },
      {
        h: "experience.badge",
        items: [
          ["experience.exp1", "experience.exp1d"],
          ["experience.exp2", "experience.exp2d"],
          ["experience.exp3", "experience.exp3d"],
          ["experience.exp4", "experience.exp4d"],
          ["experience.exp5", "experience.exp5d"],
          ["experience.exp6", "experience.exp6d"],
          ["experience.exp7", "experience.exp7d"],
          ["experience.exp8", "experience.exp8d"],
          ["experience.exp9", "experience.exp9d"],
          ["experience.exp10", "experience.exp10d"],
        ],
      },
    ],
  },
  {
    path: "/gallery",
    titleKey: "meta.galleryTitle",
    descKey: "meta.galleryDesc",
    priority: "0.8",
    changefreq: "monthly",
    heading: "gallery.title",
    lead: "gallery.subtitle",
    blocks: [
      { h: "gallery.highlights", p: "gallery.highlightsDesc" },
      {
        h: "gallery.badge",
        items: [
          ["gallery.exterior", "gallery.extDesc"],
          ["gallery.interior", "gallery.intDesc"],
          ["gallery.construction", "gallery.conDesc"],
        ],
      },
    ],
  },
  {
    path: "/book",
    titleKey: "meta.bookingTitle",
    descKey: "meta.bookingDesc",
    priority: "0.8",
    changefreq: "monthly",
    heading: "booking.heroTitle",
    lead: "booking.heroSub",
    blocks: [
      {
        h: "booking.s1Title",
        p: "booking.s1Desc",
        items: [
          ["home.alyaName", "booking.alyaTag"],
          ["home.zehraName", "booking.zehraTag"],
        ],
      },
      {
        h: "booking.s4IncTitle",
        p: "booking.s4IncDesc",
        items: [
          ["booking.incFarm", "booking.incFarmD"],
          ["booking.incFire", "booking.incFireD"],
          ["booking.incSauna", "booking.incSaunaD"],
          ["booking.incTrail", "booking.incTrailD"],
          ["booking.incChess", "booking.incChessD"],
          ["booking.incKids", "booking.incKidsD"],
        ],
      },
      {
        h: "footer.contact",
        lines: ["footer.email", "footer.phone", "footer.hours", "footer.location"],
      },
    ],
  },
  {
    path: "/privacy",
    titleKey: "privacy.title",
    descKey: "privacy.intro",
    priority: "0.3",
    changefreq: "yearly",
    heading: "privacy.title",
    lead: "privacy.intro",
    blocks: [
      { h: "privacy.dataTitle", p: "privacy.dataBody" },
      { h: "privacy.rightsTitle", p: "privacy.rightsBody" },
      { h: "privacy.contact" },
    ],
  },
  {
    path: "/cookies",
    titleKey: "cookies.title",
    descKey: "cookies.intro",
    priority: "0.3",
    changefreq: "yearly",
    heading: "cookies.title",
    lead: "cookies.intro",
    blocks: [
      { h: "cookies.whatTitle", p: "cookies.whatBody" },
      { h: "cookies.choiceTitle", p: "cookies.choiceBody" },
      { h: "cookies.contact" },
    ],
  },
  {
    path: "/terms",
    titleKey: "terms.title",
    descKey: "terms.intro",
    priority: "0.3",
    changefreq: "yearly",
    heading: "terms.title",
    lead: "terms.intro",
    blocks: [
      { h: "terms.bookTitle", p: "terms.bookBody" },
      { h: "terms.cancelTitle", p: "terms.cancelBody" },
      { h: "terms.lawTitle", p: "terms.lawBody" },
    ],
  },
  {
    path: "/impressum",
    titleKey: "impressum.title",
    descKey: "impressum.responsibleBody",
    priority: "0.3",
    changefreq: "yearly",
    heading: "impressum.title",
    lead: "impressum.responsibleBody",
    blocks: [
      { h: "impressum.contact", p: "impressum.contactBody" },
      { h: "impressum.content", p: "impressum.contentBody" },
      { h: "impressum.hosting", p: "impressum.hostingBody" },
    ],
  },
];

/** Links every prerendered page carries so crawlers can walk the site without JS. */
export const NAV_LINKS = [
  ["/", "nav.home"],
  ["/story", "nav.story"],
  ["/gallery", "nav.gallery"],
  ["/experience", "nav.experience"],
  ["/book", "nav.booking"],
];
