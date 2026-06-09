/** The built-in default manifest, derived once from MEDIA + SHOWCASE.
 *  Used as the public page fallback and the admin's initial seed.
 */

import { MEDIA, SHOWCASE } from "./galleryData";
import type { GalleryItem, GalleryManifest } from "./galleryTypes";

const showcaseFront = new Map<string, "big" | "small">(
  SHOWCASE.map((s) => [s.id, s.big ? "big" : "small"]),
);
const showcaseIds = SHOWCASE.map((s) => s.id);

// Showcase items lead (in showcase order) so the opener reads correctly, then
// the remaining media follows in its existing order.
const ordered = [
  ...showcaseIds.map((id) => MEDIA.find((m) => m.id === id)).filter(Boolean),
  ...MEDIA.filter((m) => !showcaseIds.includes(m.id)),
] as typeof MEDIA;

export const DEFAULT_MANIFEST: GalleryManifest = {
  items: ordered.map((m): GalleryItem => ({
    id: m.id,
    type: m.type,
    src: m.src,
    ...(m.type === "video" && m.poster ? { poster: m.poster } : {}),
    category: m.category,
    front: showcaseFront.get(m.id) ?? "off",
    caption: m.alt,
  })),
};
