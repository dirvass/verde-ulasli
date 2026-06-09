/** Built-in gallery source data.
 *
 *  This is the seed/fallback for the gallery. The live gallery is driven by the
 *  server manifest (editable from the admin extranet); when that is empty or
 *  unreachable, the public page falls back to a manifest derived from this data
 *  (see galleryManifest.ts). Kept free of React/DOM imports so it is safe to
 *  import in tests and pure modules.
 */

import type { Category } from "./galleryTypes";

export type Media =
  | { id: string; type: "image"; src: string; alt: string; category: Category; featured?: boolean }
  | { id: string; type: "video"; src: string; poster?: string; alt: string; category: Category };

export const MEDIA: Media[] = [
  // ─── EXTERIOR ───
  { id: "ext-havuz-deniz", type: "image", src: "/media/dis-mekan/havuz-deniz-manzarasi-konsept.jpg", alt: "Infinity pool with sea panorama", category: "exterior", featured: true },

  // ─── EXTERIOR — PEYZAJ RENDER III (May 2026) ───
  { id: "ext3-pivot-kapi", type: "image", src: "/media/dis-mekan/giris-pivot-kapi-render.jpg", alt: "Entrance with reeded pivot oak door", category: "exterior", featured: true },
  { id: "ext3-kus-bakisi-genel", type: "image", src: "/media/dis-mekan/kus-bakisi-genel-deniz-render.jpg", alt: "Resort aerial — full grounds with sea horizon", category: "exterior", featured: true },
  { id: "ext3-arka-cephe-cicek", type: "image", src: "/media/dis-mekan/arka-cephe-bahce-cicek-render.jpg", alt: "Rear view aerial — gardens in spring bloom", category: "exterior" },
  { id: "ext3-yan-aci-genel", type: "image", src: "/media/dis-mekan/kus-bakisi-yan-aci-render.jpg", alt: "Wide bird's-eye — landscaped grounds and forest", category: "exterior" },
  { id: "ext3-satranc-ates", type: "image", src: "/media/dis-mekan/yan-cephe-satranc-ates-render.jpg", alt: "Side view with chess garden and fire pit terrace", category: "exterior" },
  { id: "ext3-giris-otopark", type: "image", src: "/media/dis-mekan/giris-cephe-otopark-render.jpg", alt: "Arrival forecourt with private parking bays", category: "exterior" },

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
  { id: "ext-drone-genel", type: "image", src: "/media/dis-mekan/drone-genel-gorunum-render.jpg", alt: "Drone overview of the resort", category: "exterior" },
  { id: "ext-giris-gece", type: "image", src: "/media/dis-mekan/giris-avlusu-gece-ai-render.jpg", alt: "Entrance courtyard — evening", category: "exterior" },
  { id: "ext-giris-peyzaj", type: "image", src: "/media/dis-mekan/giris-yolu-peyzaj-render.jpg", alt: "Landscaped entrance pathway", category: "exterior" },
  { id: "ext-kus-bakisi-gece", type: "image", src: "/media/dis-mekan/kus-bakisi-gece-ai-render.jpg", alt: "Aerial view — night", category: "exterior" },
  { id: "ext-yan-cephe", type: "image", src: "/media/dis-mekan/yan-cephe-genel-gorunum-render.jpg", alt: "Side view — full resort", category: "exterior" },

  // ─── INTERIOR RENDERS (ic-mekan) — curated set, wow order ───
  { id: "int-kuvet-deniz", type: "image", src: "/media/ic-mekan/yatak-odasi-kuvet-deniz-render.jpg", alt: "Master suite with freestanding tub and panoramic gulf view", category: "interior", featured: true },
  { id: "int-somine", type: "image", src: "/media/ic-mekan/salon-somine-deri-koltuk-render-v2.jpg", alt: "Living room with fireplace, leather sofa and gulf view", category: "interior", featured: true },
  { id: "int-infinity-havuz", type: "image", src: "/media/ic-mekan/salon-infinity-havuz-manzara-render-v2.jpg", alt: "Great room opening to the infinity pool and forested gulf view", category: "interior", featured: true },
  { id: "int-yesil-dus-manzara", type: "image", src: "/media/ic-mekan/yatak-odasi-yesil-dus-manzara-render-v2.jpg", alt: "Master bedroom with green walk-in shower and gulf view", category: "interior", featured: true },
  { id: "int-loft-deniz", type: "image", src: "/media/ic-mekan/loft-yatak-odasi-deniz-render.jpg", alt: "Double-height loft bedroom with mezzanine and view", category: "interior" },
  { id: "int-loft-asma", type: "image", src: "/media/ic-mekan/loft-yatak-odasi-asma-kat-render.jpg", alt: "Loft bedroom with mezzanine bed", category: "interior" },
  { id: "int-banyo-yesil", type: "image", src: "/media/ic-mekan/banyo-yesil-dus-render.jpg", alt: "Bathroom with green herringbone walk-in shower", category: "interior" },
  { id: "int-mutfak", type: "image", src: "/media/ic-mekan/mutfak-ada-yeni-render.jpg", alt: "Kitchen with marble island", category: "interior" },
  { id: "int-yemek", type: "image", src: "/media/ic-mekan/yemek-odasi-render.jpg", alt: "Dining area with open kitchen", category: "interior" },
  { id: "int-salon-deri", type: "image", src: "/media/ic-mekan/salon-deri-koltuk-manzara-render.jpg", alt: "Lounge with leather sofa", category: "interior" },
  { id: "int-sinema", type: "image", src: "/media/ic-mekan/ev-sinema-render.jpg", alt: "Home cinema room", category: "interior" },
  { id: "int-giyinme", type: "image", src: "/media/ic-mekan/giyinme-odasi-render.jpg", alt: "Walk-in dressing room", category: "interior" },
  { id: "int-tuvalet", type: "image", src: "/media/ic-mekan/misafir-tuvalet-render-v2.jpg", alt: "Powder room", category: "interior" },
  { id: "int-giyinme-koridor", type: "image", src: "/media/ic-mekan/giyinme-odasi-koridor-render-v2.jpg", alt: "Dressing corridor with display shelving", category: "interior" },

  // ─── CONSTRUCTION PROCESS (insaat-sureci) ───
  { id: "vid-villa-zeytin-deniz", type: "video", src: "/media/videolar/insaat-villa-zeytin-deniz-v2.mp4", poster: "/media/videolar/insaat-villa-zeytin-deniz-poster.jpg", alt: "Villa shell with olive tree and sea view", category: "construction" },
  { id: "vid-arazi-zeytin", type: "video", src: "/media/videolar/insaat-arazi-zeytin-v2.mp4", poster: "/media/videolar/insaat-arazi-zeytin-poster.jpg", alt: "Walking the land — olive trees and terraced grounds", category: "construction" },
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
  { id: "vid-1", type: "video", src: "/media/videolar/villa-video-1.mp4", poster: "/media/videolar/villa-video-1-poster.jpg", alt: "Villa site tour 1", category: "construction" },
  { id: "vid-2", type: "video", src: "/media/videolar/villa-video-2.mp4", poster: "/media/videolar/villa-video-2-poster.jpg", alt: "Villa site tour 2", category: "construction" },
  { id: "vid-3", type: "video", src: "/media/videolar/villa-video-3.mp4", poster: "/media/videolar/villa-video-3-poster.jpg", alt: "Villa interior walkthrough", category: "interior" },
  { id: "vid-4", type: "video", src: "/media/videolar/villa-video-4.mp4", poster: "/media/videolar/villa-video-4-poster.jpg", alt: "Construction progress walkthrough", category: "construction" },
];

// Curated opening for the "All" view. The estate's signature exterior shots
// lead as the large cards — the infinity pool over the gulf first, then the
// garden aerial, then the entrance — with the best interior rooms in the
// smaller boxes alongside. `big` maps to front="big", otherwise front="small".
export const SHOWCASE: { id: string; big: boolean }[] = [
  { id: "ext-havuz-deniz", big: true },        // 1 — infinity pool over the gulf
  { id: "int-kuvet-deniz", big: false },
  { id: "int-somine", big: false },
  { id: "ext2-bahce-patika", big: true },       // 2 — garden aerial
  { id: "int-infinity-havuz", big: false },
  { id: "int-yesil-dus-manzara", big: false },
  { id: "ext3-pivot-kapi", big: true },          // 3 — entrance with pivot oak door
  { id: "int-loft-deniz", big: false },
  { id: "int-mutfak", big: false },
];
