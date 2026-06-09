/** Shared gallery manifest types + client-side validation.
 *
 *  The manifest is the single source of truth for the public gallery: an
 *  ordered list of items. It is stored server-side in KV and edited from the
 *  admin extranet. This module holds the types and a defensive client
 *  validator (mirrored by a self-contained server validator in
 *  functions/api/gallery.ts — same pattern as availability.ts).
 */

export type Category = "interior" | "exterior" | "construction";
/** Opener membership + card size. "off" = not in the "A First Look" opener. */
export type Front = "off" | "big" | "small";

export interface GalleryItem {
  id: string;
  type: "image" | "video";
  src: string;
  poster?: string;
  category: Category;
  front: Front;
  caption: string;
}

export interface GalleryManifest {
  items: GalleryItem[];
}

export const CATEGORIES: Category[] = ["interior", "exterior", "construction"];
export const FRONTS: Front[] = ["off", "big", "small"];

const MAX_ITEMS = 600;
const MAX_CAPTION = 300;

function safeSrc(s: unknown): s is string {
  return typeof s === "string" && (s.startsWith("/media/") || s.startsWith("/api/media/"));
}

function cleanCaption(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.replace(/<[^>]*>/g, "").trim().slice(0, MAX_CAPTION);
}

function validateItem(raw: unknown): GalleryItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0 || o.id.length > 120) return null;
  if (o.type !== "image" && o.type !== "video") return null;
  if (!safeSrc(o.src)) return null;
  if (!CATEGORIES.includes(o.category as Category)) return null;
  if (!FRONTS.includes(o.front as Front)) return null;
  const item: GalleryItem = {
    id: o.id,
    type: o.type,
    src: o.src,
    category: o.category as Category,
    front: o.front as Front,
    caption: cleanCaption(o.caption),
  };
  if (o.poster !== undefined) {
    if (!safeSrc(o.poster)) return null;
    item.poster = o.poster;
  }
  return item;
}

/** Returns a clean manifest, or null if the input is structurally invalid. */
export function validateManifest(input: unknown): GalleryManifest | null {
  if (typeof input !== "object" || input === null) return null;
  const items = (input as Record<string, unknown>).items;
  if (!Array.isArray(items) || items.length > MAX_ITEMS) return null;
  const out: GalleryItem[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const it = validateItem(raw);
    if (!it) return null;
    if (seen.has(it.id)) return null;
    seen.add(it.id);
    out.push(it);
  }
  return { items: out };
}
