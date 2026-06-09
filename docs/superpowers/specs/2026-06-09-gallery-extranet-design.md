# Gallery Extranet — Design Spec

**Date:** 2026-06-09
**Status:** Approved (plain-language design approved by Ahmed)
**Goal:** Let the owner manage the public gallery himself — upload, reorder, delete,
re-categorise, resize (hero/normal), and caption photos — with changes going live
instantly, no developer and no redeploy.

## Background

Today the gallery is a hardcoded `MEDIA` array in `src/GalleryPage.tsx`. The public
`/gallery` "All" view shows a curated showcase ("A First Look") followed by three
category sections (Interior / Exterior / Construction). Every change requires a code
edit + push. Images live as static files in `public/media/**`.

The site already has an admin **extranet** at `/admin` (password/token protected) with
two tabs (Availability, Enquiries), backed by Cloudflare Pages Functions
(`functions/api/availability.ts`, `enquiry.ts`) using a KV namespace + `ADMIN_TOKEN`
bearer auth (constant-time compare). The gallery manager reuses these patterns.

## Scope

**In scope**
- New **Gallery** tab in `/admin`.
- Upload new **photos** (images), auto-optimised client-side before upload.
- Reorder (drag), delete, set category, set front/size, edit caption.
- Public gallery renders from the saved arrangement, instantly, for all visitors.
- Robust fallback so the public page is never broken.

**Out of scope (for now)**
- Uploading new **videos** (existing videos remain, managed in the list but not
  re-uploadable). Can be added later.
- Multi-language captions (current site uses a single English `alt`; caption is one
  text field, matching today's behaviour).
- Cropping/editing images beyond auto-resize.

## Architecture

Single source of truth = a **manifest** (ordered JSON list of items) stored in KV.
Uploaded image binaries stored in **R2**. Public page renders from the manifest with a
built-in fallback.

### Storage
- **KV namespace `GALLERY`** — key `manifest` → JSON `{ items: Item[] }`.
- **R2 bucket** bound as `GALLERY_BUCKET` — uploaded image objects, keyed
  `up/<uuid>.<ext>`.
- `ADMIN_TOKEN` env — reused from existing admin (bearer auth).

### Data model (`Item`)
```
{
  id: string,            // stable unique id (uuid for uploads; existing ids when seeded)
  type: "image" | "video",
  src: string,           // "/media/..." (built-in) or "/api/media/<key>" (uploaded)
  poster?: string,       // videos only
  category: "interior" | "exterior" | "construction",
  front: "off" | "big" | "small",  // opener membership + size in opener
  caption: string        // single-language text (was `alt`)
}
```
Order is the array position. No separate `order` field.

### Pages Function — `functions/api/gallery.ts`
- `GET /api/gallery` → public. Returns `{ items }` (or `{ items: [] }` if unset).
  `cache-control: no-store` (small payload; always fresh).
- `POST /api/gallery` → admin (bearer). Body `{ items }`. Validates, writes KV.
- `POST /api/gallery/upload` → admin (bearer). Body = image bytes (already resized
  client-side) + `x-content-type`/`x-ext` headers. Stores in R2, returns `{ key, src }`.
  Server caps body size (~6 MB) as a backstop.
- `OPTIONS` → CORS preflight (same shape as availability).

### Media serving — `functions/api/media/[[path]].ts`
- `GET /api/media/<key>` → streams the R2 object with
  `cache-control: public, max-age=31536000, immutable`. Cached at the edge.

### Public page integration (`GalleryPage.tsx`)
- On mount, `fetch("/api/gallery")`.
  - Success + non-empty → use server items.
  - Failure / empty → fall back to `DEFAULT_MANIFEST` (built from the current `MEDIA`
    + showcase order). Page is never broken, works even before first save.
- Render:
  - **"A First Look"** = items with `front !== "off"`, in order, sized per `front`.
  - **Category sections** = items grouped by category, in order, rendered uniformly.
  - Lightbox unchanged; navigates within the active filtered list.

### Seeding / migration
- `DEFAULT_MANIFEST` is derived once from the existing `MEDIA` array + the `SHOWCASE`
  list (featured/showcase → `front`, `alt` → `caption`), exported from a shared module
  (`src/data/galleryManifest.ts`) used by both the public fallback and the admin seed.
- Admin Gallery tab on first load: if server manifest is empty, auto-seed by POSTing
  `DEFAULT_MANIFEST`, then display it. Owner edits from there.

### Admin UI (Gallery tab)
- Grid of cards (thumbnail + controls): drag handle to reorder, category dropdown,
  front selector (Off / Big / Small), caption input, delete (with confirm).
- Upload zone (file picker + drag-drop). On select: resize to max 1920px long edge,
  JPEG q≈0.85 via canvas, then upload; on success append a new `image` item.
- Save button → POST manifest. Reuses existing token prompt/localStorage flow.
- Mobile: provide move up/down buttons alongside drag (touch drag is unreliable).

### Client-side image optimisation
- Canvas resize, longest edge ≤ 1920px, output JPEG ~0.85. Enforces the existing
  "1920px/q85 or Cloudflare won't serve it well" rule automatically. Non-images
  rejected with a friendly message.

## Validation & security
- Manifest: max ~600 items; `category`/`front`/`type` enum-checked; `src` must start
  with `/media/` or `/api/media/` (no external URLs / no `javascript:`); caption length
  capped (~300) and stripped of HTML; poster optional same rules.
- Upload: bearer required; content-type must be `image/*`; size cap server-side.
- Auth: bearer `ADMIN_TOKEN`, constant-time compare (copy from availability).

## Error handling
- Public fetch fail → silent fallback to default manifest.
- Admin token rejected (401) → clear token, prompt to re-enter (existing pattern).
- Upload failure → inline message, item not added.
- Save failure → inline message, local edits preserved for retry.
- Orphaned R2 objects (deleted-from-list uploads) are left in place (storage is free,
  tiny); acceptable. Optional cleanup later.

## Cloudflare setup (one-time)
- Create KV namespace, bind as `GALLERY`.
- Create R2 bucket, bind as `GALLERY_BUCKET`.
- `ADMIN_TOKEN` already set.
- Done via dashboard or `wrangler`. (Owner-facing: "one switch to enable storage.")

## Testing
- Keep manifest validation as a pure function; unit-test it (the project has no test
  runner yet — add a minimal one or test the pure function in isolation).
- Manual verification: upload → appears; reorder/category/front/caption → save →
  reload public page reflects it; delete → gone; simulate API down → public falls back.

## Cost
- R2 + KV free tiers cover this comfortably (≈60 images, low traffic). €0 ongoing.

## Future (not now)
- Video upload, multi-language captions, image cropping, orphan cleanup, per-villa
  galleries.
