// One-shot helper: fill missing keys in ar.json with "[AR] <en-value>" placeholders.
// Preserves existing Arabic translations. Run:   node scripts/fill-ar-placeholders.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const enPath = resolve(root, "src/i18n/en.json");
const arPath = resolve(root, "src/i18n/ar.json");

const en = JSON.parse(readFileSync(enPath, "utf8"));
const ar = JSON.parse(readFileSync(arPath, "utf8"));

const PREFIX = "[AR] ";
let added = 0;

function fill(src, dst, path = "") {
  if (src === null || typeof src !== "object" || Array.isArray(src)) return;
  for (const key of Object.keys(src)) {
    const here = path ? `${path}.${key}` : key;
    const srcVal = src[key];

    if (srcVal && typeof srcVal === "object" && !Array.isArray(srcVal)) {
      if (!dst[key] || typeof dst[key] !== "object" || Array.isArray(dst[key])) {
        dst[key] = {};
      }
      fill(srcVal, dst[key], here);
    } else if (typeof srcVal === "string") {
      if (typeof dst[key] !== "string" || dst[key].length === 0) {
        dst[key] = srcVal.startsWith(PREFIX) ? srcVal : `${PREFIX}${srcVal}`;
        added++;
      }
    } else {
      // numbers, booleans, arrays: copy through untouched if missing
      if (dst[key] === undefined) {
        dst[key] = srcVal;
        added++;
      }
    }
  }
}

fill(en, ar);

writeFileSync(arPath, JSON.stringify(ar, null, 2) + "\n", "utf8");
console.log(`Added ${added} placeholder keys to ar.json`);
