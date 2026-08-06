/**
 * Post-build step: turn the single-page bundle into one crawler-readable HTML
 * file per public route.
 *
 * Why: verde-ulasli.com renders entirely on the client, so every crawler that
 * does not execute JavaScript (OpenAI's GPTBot / OAI-SearchBot, Perplexity,
 * WhatsApp, LinkedIn) receives an empty shell with one English sentence. Google
 * renders JS but indexes static markup faster and more reliably.
 *
 * What it emits per route:
 *   - page-specific <title>, description, canonical, OG/Twitter tags
 *   - hreflang alternates and JSON-LD baked into the HTML
 *   - the page's real copy inside #root, read from src/i18n/en.json
 *
 * main.tsx mounts with createRoot(), which replaces #root's children, so the
 * static copy disappears the moment React takes over. Users see no change.
 *
 * Run: node scripts/prerender.mjs   (wired into `npm run build`)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ROUTES,
  NAV_LINKS,
  SITE_ORIGIN,
  OG_IMAGE,
  DEFAULT_LOCALE,
  LOCALES,
} from "./routes.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text for HTML output, including attribute values. */
function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Resolve a dotted i18n key. Throws rather than shipping a raw key to a crawler. */
function makeTranslator(dict, locale) {
  return (key) => {
    const value = key.split(".").reduce((acc, part) => acc?.[part], dict);
    if (typeof value !== "string") {
      throw new Error(`prerender: missing i18n key "${key}" in ${locale}.json`);
    }
    return value;
  };
}

function renderBlock(block, t) {
  const parts = [];
  if (block.h) parts.push(`<h2>${esc(t(block.h))}</h2>`);
  if (block.p) parts.push(`<p>${esc(t(block.p))}</p>`);

  if (block.items) {
    const rows = block.items
      .map(([term, desc]) => `<dt>${esc(t(term))}</dt><dd>${esc(t(desc))}</dd>`)
      .join("");
    parts.push(`<dl>${rows}</dl>`);
  }

  if (block.facts) {
    const rows = block.facts
      .map(([label, value]) => `<li>${esc(t(label))}: ${esc(value)}</li>`)
      .join("");
    parts.push(`<ul>${rows}</ul>`);
  }

  if (block.lines) {
    const rows = block.lines.map((key) => `<li>${esc(t(key))}</li>`).join("");
    parts.push(`<ul>${rows}</ul>`);
  }

  return parts.join("");
}

/**
 * Brand-consistent styling for the shell. It is on screen only until React
 * mounts, and it is the whole page for a visitor with JavaScript disabled, so it
 * should look deliberate rather than like unstyled markup. Lives inside the shell
 * so React removes it together with the content.
 */
const SHELL_STYLE = `<style>
#seo-shell{max-width:44rem;margin:0 auto;padding:4rem 1.5rem;color:#EBE8E1;background:#0E1A16;font-family:Inter,system-ui,sans-serif;line-height:1.65}
#seo-shell h1,#seo-shell h2{font-family:'Playfair Display',Georgia,serif;font-weight:600;color:#EBE8E1}
#seo-shell h1{font-size:2.25rem;line-height:1.15;margin:0 0 1rem}
#seo-shell h2{font-size:1.375rem;margin:2.5rem 0 .75rem}
#seo-shell p{margin:0 0 1rem;color:#C9B99A}
#seo-shell dt{font-weight:600;margin-top:1rem;color:#C3A564}
#seo-shell dd{margin:.25rem 0 0;color:#C9B99A}
#seo-shell ul{padding-left:1.25rem;color:#C9B99A}
#seo-shell a{color:#C3A564}
</style>`;

/**
 * The copy a JS-less crawler reads. Lives inside #root, so React discards it on
 * mount. aria-hidden is deliberately absent: this is the page's real content,
 * not decoration.
 */
function renderShell(route, t) {
  const nav = NAV_LINKS.map(
    ([path, key]) => `<li><a href="${esc(path)}">${esc(t(key))}</a></li>`
  ).join("");

  const blocks = route.blocks.map((b) => renderBlock(b, t)).join("");

  return [
    `<div id="seo-shell">`,
    SHELL_STYLE,
    `<h1>${esc(t(route.heading))}</h1>`,
    `<p>${esc(t(route.lead))}</p>`,
    blocks,
    `<nav aria-label="${esc(t("footer.nav"))}"><ul>${nav}</ul></nav>`,
    `</div>`,
  ].join("");
}

function renderJsonLd(route, t) {
  const url = `${SITE_ORIGIN}${route.path}`;

  const lodging = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE_ORIGIN}/#lodging`,
    name: "VERDE Ulaşlı",
    url: SITE_ORIGIN,
    image: `${SITE_ORIGIN}${OG_IMAGE}`,
    description: t("meta.homeDesc"),
    email: t("footer.email"),
    telephone: t("footer.phone"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ulaşlı",
      addressRegion: "Kocaeli",
      addressCountry: "TR",
    },
    priceRange: "€€€",
    numberOfRooms: 6,
    petsAllowed: false,
    availableLanguage: ["en", "tr", "de", "ar"],
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Infinity pool", value: true },
      { "@type": "LocationFeatureSpecification", name: "Organic garden", value: true },
      { "@type": "LocationFeatureSpecification", name: "Sauna", value: true },
      { "@type": "LocationFeatureSpecification", name: "Private resort", value: true },
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    url: SITE_ORIGIN,
    name: "VERDE Ulaşlı",
    inLanguage: DEFAULT_LOCALE,
    publisher: { "@id": `${SITE_ORIGIN}/#lodging` },
  };

  const graph = [lodging, website];

  if (route.path !== "/") {
    graph.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("nav.home"), item: SITE_ORIGIN },
        { "@type": "ListItem", position: 2, name: t(route.heading), item: url },
      ],
    });
  }

  // </script> cannot appear inside a script block; JSON-LD text is not HTML-escaped.
  // The id matches usePageMeta.ts's JSON_LD_ID so the runtime hook overwrites this
  // node instead of appending a second one.
  const json = JSON.stringify(graph).replace(/</g, "\\u003c");
  return `<script type="application/ld+json" id="verde-ld">${json}</script>`;
}

function renderHeadLinks(route) {
  const url = `${SITE_ORIGIN}${route.path}`;
  const links = [`<link rel="canonical" href="${esc(url)}" />`];

  for (const locale of LOCALES) {
    links.push(
      `<link rel="alternate" hreflang="${esc(locale)}" href="${esc(`${url}?lang=${locale}`)}" />`
    );
  }
  links.push(`<link rel="alternate" hreflang="x-default" href="${esc(url)}" />`);

  return links.join("");
}

/** Replace the content of a meta tag matched by attribute, or leave the template alone. */
function setMetaContent(html, attr, name, content) {
  const pattern = new RegExp(
    `(<meta\\s+${attr}="${name.replace(/[$]/g, "\\$")}"\\s+content=")[^"]*(")`,
    "i"
  );
  if (!pattern.test(html)) {
    throw new Error(`prerender: no <meta ${attr}="${name}"> in index.html template`);
  }
  return html.replace(pattern, `$1${esc(content)}$2`);
}

function buildPage(template, route, t) {
  const title = t(route.titleKey);
  const desc = t(route.descKey);
  const url = `${SITE_ORIGIN}${route.path}`;

  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);

  html = setMetaContent(html, "name", "description", desc);
  html = setMetaContent(html, "property", "og:title", title);
  html = setMetaContent(html, "property", "og:description", desc);
  html = setMetaContent(html, "property", "og:url", url);
  html = setMetaContent(html, "name", "twitter:title", title);
  html = setMetaContent(html, "name", "twitter:description", desc);

  const head = renderHeadLinks(route) + renderJsonLd(route, t);
  html = html.replace("</head>", `${head}</head>`);

  const shell = renderShell(route, t);
  const rootPattern = /<div id="root">\s*<\/div>/;
  if (!rootPattern.test(html)) {
    throw new Error('prerender: no empty <div id="root"></div> in index.html template');
  }
  html = html.replace(rootPattern, `<div id="root">${shell}</div>`);

  return html;
}

function buildSitemap(routes, lastmod) {
  const entries = routes
    .map((route) => {
      const url = `${SITE_ORIGIN}${route.path}`;
      const alternates = LOCALES.map(
        (locale) =>
          `    <xhtml:link rel="alternate" hreflang="${locale}" href="${url}?lang=${locale}"/>`
      ).join("\n");

      return [
        "  <url>",
        `    <loc>${url}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority}</priority>`,
        alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${url}"/>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;
}

/**
 * Cloudflare Pages resolves /gallery to /gallery/index.html on its own, but the
 * SPA catch-all in _redirects can win first. Explicit 200 rules per route, kept
 * above the catch-all, make the prerendered file authoritative either way.
 */
function buildRedirects(source, routes) {
  const marker = "# prerendered routes (generated by scripts/prerender.mjs)";
  const rules = routes
    .filter((route) => route.path !== "/")
    .map((route) => `${route.path} ${route.path}/index.html 200`);
  const ruleSet = new Set(rules);

  // Drop any previously generated block so repeat runs stay idempotent.
  const kept = source
    .split(/\r?\n/)
    .filter((line) => line.trim() !== marker && !ruleSet.has(line.trim()));

  const catchAllAt = kept.findIndex((line) => line.trim().startsWith("/*"));
  const insertAt = catchAllAt === -1 ? kept.length : catchAllAt;

  return [...kept.slice(0, insertAt), marker, ...rules, "", ...kept.slice(insertAt)].join("\n");
}

async function main() {
  if (!existsSync(DIST)) {
    throw new Error("prerender: dist/ not found — run vite build first");
  }

  const template = await readFile(join(DIST, "index.html"), "utf8");
  const dict = JSON.parse(await readFile(join(ROOT, "src/i18n/en.json"), "utf8"));
  const t = makeTranslator(dict, DEFAULT_LOCALE);
  const lastmod = new Date().toISOString().slice(0, 10);

  for (const route of ROUTES) {
    const html = buildPage(template, route, t);
    const target =
      route.path === "/"
        ? join(DIST, "index.html")
        : join(DIST, route.path.replace(/^\//, ""), "index.html");

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html, "utf8");
  }

  await writeFile(join(DIST, "sitemap.xml"), buildSitemap(ROUTES, lastmod), "utf8");

  const redirectsPath = join(DIST, "_redirects");
  const redirects = existsSync(redirectsPath) ? await readFile(redirectsPath, "utf8") : "";
  await writeFile(redirectsPath, buildRedirects(redirects, ROUTES), "utf8");

  console.log(
    `prerender: ${ROUTES.length} routes, sitemap and _redirects written to dist/ (lastmod ${lastmod})`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
