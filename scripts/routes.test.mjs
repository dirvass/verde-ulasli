import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ROUTES, NAV_LINKS, LOCALES } from "./routes.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DICTS = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(join(ROOT, `src/i18n/${locale}.json`), "utf8")),
  ])
);

/** Every i18n key the prerender step will look up. */
function referencedKeys() {
  const keys = new Set();

  for (const route of ROUTES) {
    keys.add(route.titleKey);
    keys.add(route.descKey);
    keys.add(route.heading);
    keys.add(route.lead);

    for (const block of route.blocks) {
      if (block.h) keys.add(block.h);
      if (block.p) keys.add(block.p);
      for (const [term, desc] of block.items ?? []) {
        keys.add(term);
        keys.add(desc);
      }
      for (const [label] of block.facts ?? []) keys.add(label);
      for (const line of block.lines ?? []) keys.add(line);
    }
  }

  for (const [, key] of NAV_LINKS) keys.add(key);
  keys.add("footer.nav");
  keys.add("footer.email");
  keys.add("footer.phone");
  keys.add("meta.homeDesc");
  keys.add("nav.home");

  return [...keys];
}

function lookup(dict, key) {
  return key.split(".").reduce((acc, part) => acc?.[part], dict);
}

describe("prerender route table", () => {
  it("references only paths the router serves", () => {
    // Keep in sync with src/App.tsx. /investor and /admin stay unindexed.
    const routerPaths = [
      "/",
      "/story",
      "/experience",
      "/book",
      "/gallery",
      "/privacy",
      "/cookies",
      "/terms",
      "/impressum",
    ];
    expect(ROUTES.map((r) => r.path).sort()).toEqual([...routerPaths].sort());
  });

  it.each(LOCALES)("resolves every referenced key in %s.json", (locale) => {
    const missing = referencedKeys().filter(
      (key) => typeof lookup(DICTS[locale], key) !== "string"
    );
    expect(missing).toEqual([]);
  });

  it("gives every route a unique path and a sitemap priority", () => {
    const paths = ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const route of ROUTES) {
      expect(route.priority).toMatch(/^[01](\.\d)?$/);
      expect(route.changefreq).toBeTruthy();
    }
  });
});
