# Gallery Extranet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an owner-managed gallery to the `/admin` extranet — upload, reorder, delete, re-categorise, resize, and caption photos — with the public `/gallery` rendering the saved arrangement live.

**Architecture:** Single source of truth = an ordered JSON **manifest** in a Cloudflare KV namespace (`GALLERY`, key `manifest`). Uploaded image bytes live in an R2 bucket (`GALLERY_BUCKET`) and are served via a Pages Function with immutable caching. The public page fetches the manifest and falls back to a built-in default (derived from the current `MEDIA` array) when the API is unavailable, so it is never broken. Admin writes are bearer-authenticated with the existing `ADMIN_TOKEN`.

**Tech Stack:** React 18 + TypeScript + Vite 5, Cloudflare Pages Functions, KV, R2. Vitest for unit-testing pure logic.

---

## File Structure

- `functions/api/_lib/manifest.ts` — pure manifest types + validation/sanitisation (shared, testable).
- `functions/api/_lib/manifest.test.ts` — unit tests for the validator.
- `functions/api/gallery.ts` — GET (public) / POST (save) / upload, bearer auth.
- `functions/api/media/[[path]].ts` — stream R2 objects with long cache.
- `src/data/galleryManifest.ts` — shared `GalleryItem` type + `DEFAULT_MANIFEST` derived from `MEDIA`/`SHOWCASE`; re-exports the `MEDIA`/`SHOWCASE` source.
- `src/lib/imageResize.ts` — client canvas resize to ≤1920px JPEG.
- `src/galleryStore.ts` — client fetch/save/upload helpers + token (mirrors `availability.ts`).
- `src/GalleryPage.tsx` — modify: render from manifest (server or default).
- `src/AdminPage.tsx` — modify: add "Gallery" tab.
- `src/components/GalleryAdmin.tsx` — new admin Gallery tab component.
- `src/styles/AdminPage.css` — modify: styles for the gallery admin grid.
- `vitest.config.ts`, `package.json` — add test harness.
- `docs/CLOUDFLARE-GALLERY-SETUP.md` — binding setup steps.

Order field is array position. `front: "off" | "big" | "small"` controls opener membership; card size everywhere = `front === "big"`.

---

### Task 1: Add Vitest test harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add Vitest dev dependency and test script**

Run:
```bash
cd nest-planner && npm i -D vitest@^2
```

Then add to `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "functions/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Verify the runner works (no tests yet)**

Run: `npm test`
Expected: exits 0 with "No test files found" (or similar) — runner is wired.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test harness"
```

---

### Task 2: Manifest types + validator (pure, TDD)

**Files:**
- Create: `functions/api/_lib/manifest.ts`
- Test: `functions/api/_lib/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { validateManifest, type GalleryManifest } from "./manifest";

const good: GalleryManifest = {
  items: [
    { id: "a", type: "image", src: "/media/x.jpg", category: "interior", front: "big", caption: "Room" },
    { id: "b", type: "image", src: "/api/media/up/123.jpg", category: "exterior", front: "off", caption: "" },
  ],
};

describe("validateManifest", () => {
  it("accepts a well-formed manifest", () => {
    expect(validateManifest(good)).toEqual(good);
  });
  it("rejects external/unsafe src", () => {
    expect(validateManifest({ items: [{ ...good.items[0], src: "https://evil.com/x.jpg" }] })).toBeNull();
    expect(validateManifest({ items: [{ ...good.items[0], src: "javascript:alert(1)" }] })).toBeNull();
  });
  it("rejects bad enums", () => {
    expect(validateManifest({ items: [{ ...good.items[0], category: "garden" }] })).toBeNull();
    expect(validateManifest({ items: [{ ...good.items[0], front: "huge" }] })).toBeNull();
  });
  it("rejects non-array / oversized", () => {
    expect(validateManifest({ items: "x" })).toBeNull();
    expect(validateManifest({ items: Array(601).fill(good.items[0]) })).toBeNull();
  });
  it("strips html and caps caption length", () => {
    const out = validateManifest({ items: [{ ...good.items[0], caption: "<b>hi</b>".padEnd(400, "x") }] });
    expect(out!.items[0].caption.includes("<")).toBe(false);
    expect(out!.items[0].caption.length).toBeLessThanOrEqual(300);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- manifest`
Expected: FAIL — cannot find `./manifest`.

- [ ] **Step 3: Implement `functions/api/_lib/manifest.ts`**

```ts
export type Category = "interior" | "exterior" | "construction";
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

const CATEGORIES: Category[] = ["interior", "exterior", "construction"];
const FRONTS: Front[] = ["off", "big", "small"];
const MAX_ITEMS = 600;
const MAX_CAPTION = 300;

function safeSrc(s: unknown): s is string {
  return typeof s === "string" && (s.startsWith("/media/") || s.startsWith("/api/media/"));
}

function clean(s: unknown): string {
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
    src: o.src as string,
    category: o.category as Category,
    front: o.front as Front,
    caption: clean(o.caption),
  };
  if (o.poster !== undefined) {
    if (!safeSrc(o.poster)) return null;
    item.poster = o.poster as string;
  }
  return item;
}

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- manifest`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/api/_lib/manifest.ts functions/api/_lib/manifest.test.ts
git commit -m "feat(gallery): manifest types and validator"
```

---

### Task 3: Shared client manifest module + default seed (TDD the derivation)

**Files:**
- Modify: `src/GalleryPage.tsx` (export `MEDIA`, `SHOWCASE`, `Media`, `Category`)
- Create: `src/data/galleryManifest.ts`
- Test: `src/data/galleryManifest.test.ts`

- [ ] **Step 1: Export the source data from `GalleryPage.tsx`**

Change `const MEDIA: Media[]` → `export const MEDIA: Media[]`, `const SHOWCASE` → `export const SHOWCASE`, and `type Media`/`type Category` → `export type Media`/`export type Category`.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_MANIFEST } from "./galleryManifest";

describe("DEFAULT_MANIFEST", () => {
  it("maps every MEDIA item to a valid manifest item", () => {
    expect(DEFAULT_MANIFEST.items.length).toBeGreaterThan(50);
    for (const it of DEFAULT_MANIFEST.items) {
      expect(["interior", "exterior", "construction"]).toContain(it.category);
      expect(["off", "big", "small"]).toContain(it.front);
      expect(it.caption.length).toBeGreaterThan(0);
    }
  });
  it("puts the infinity pool first with front=big", () => {
    expect(DEFAULT_MANIFEST.items[0].id).toBe("ext-havuz-deniz");
    expect(DEFAULT_MANIFEST.items[0].front).toBe("big");
  });
  it("the garden aerial is a big front item", () => {
    const aerial = DEFAULT_MANIFEST.items.find(i => i.id === "ext2-bahce-patika");
    expect(aerial?.front).toBe("big");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- galleryManifest`
Expected: FAIL — cannot find `./galleryManifest`.

- [ ] **Step 4: Implement `src/data/galleryManifest.ts`**

```ts
import { MEDIA, SHOWCASE } from "../GalleryPage";
import type { GalleryItem, GalleryManifest } from "../../functions/api/_lib/manifest";

export type { GalleryItem, GalleryManifest } from "../../functions/api/_lib/manifest";

const showcaseFront = new Map<string, "big" | "small">(
  SHOWCASE.map((s) => [s.id, s.big ? "big" : "small"]),
);

// Build the seed in showcase order first (so the opener leads), then the rest.
const showcaseIds = SHOWCASE.map((s) => s.id);
const ordered = [
  ...showcaseIds.map((id) => MEDIA.find((m) => m.id === id)).filter(Boolean),
  ...MEDIA.filter((m) => !showcaseIds.includes(m.id)),
] as typeof MEDIA;

export const DEFAULT_MANIFEST: GalleryManifest = {
  items: ordered.map((m): GalleryItem => ({
    id: m.id,
    type: m.type,
    src: m.src,
    poster: m.type === "video" ? m.poster : undefined,
    category: m.category,
    front: showcaseFront.get(m.id) ?? "off",
    caption: m.alt,
  })),
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- galleryManifest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/GalleryPage.tsx src/data/galleryManifest.ts src/data/galleryManifest.test.ts
git commit -m "feat(gallery): shared default manifest derived from MEDIA"
```

---

### Task 4: Gallery API Pages Function

**Files:**
- Create: `functions/api/gallery.ts`

- [ ] **Step 1: Implement the function**

```ts
import { validateManifest, type GalleryManifest } from "./_lib/manifest";

interface Env {
  GALLERY: KVNamespace;
  GALLERY_BUCKET: R2Bucket;
  ADMIN_TOKEN: string;
}

const KV_KEY = "manifest";
const MAX_UPLOAD = 6 * 1024 * 1024; // 6 MB backstop (client already resizes)

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, x-ext",
  "access-control-max-age": "86400",
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cors, ...(init.headers || {}) },
  });
}

function authed(request: Request, env: Env): boolean {
  const expected = env.ADMIN_TOKEN || "";
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || token.length === 0 || token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

async function readManifest(env: Env): Promise<GalleryManifest> {
  const raw = await env.GALLERY.get(KV_KEY);
  if (!raw) return { items: [] };
  const parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  return validateManifest(parsed) ?? { items: [] };
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json(await readManifest(env));

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (!env.ADMIN_TOKEN) return json({ error: "server-misconfigured" }, { status: 500 });
  if (!authed(request, env)) return json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  // Upload branch: /api/gallery?upload=1  (raw image bytes)
  if (url.searchParams.get("upload") === "1") {
    const ct = request.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return json({ error: "not-an-image" }, { status: 400 });
    const buf = await request.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_UPLOAD) return json({ error: "bad-size" }, { status: 400 });
    const ext = (request.headers.get("x-ext") || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    const key = `up/${crypto.randomUUID()}.${ext}`;
    await env.GALLERY_BUCKET.put(key, buf, { httpMetadata: { contentType: ct } });
    return json({ key, src: `/api/media/${key}` });
  }

  // Save branch: full manifest
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid-json" }, { status: 400 }); }
  const manifest = validateManifest(body);
  if (!manifest) return json({ error: "invalid-manifest" }, { status: 400 });
  await env.GALLERY.put(KV_KEY, JSON.stringify(manifest));
  return json({ ok: true, data: manifest });
};
```

- [ ] **Step 2: Type-check**

Run: `cd nest-planner && npx tsc --noEmit`
Expected: OK (assumes `@cloudflare/workers-types` present — same as availability.ts which already uses `KVNamespace`/`PagesFunction`).

- [ ] **Step 3: Commit**

```bash
git add functions/api/gallery.ts
git commit -m "feat(gallery): API function (get/save/upload)"
```

---

### Task 5: R2 media serving function

**Files:**
- Create: `functions/api/media/[[path]].ts`

- [ ] **Step 1: Implement streaming with immutable cache**

```ts
interface Env { GALLERY_BUCKET: R2Bucket; }

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const parts = params.path;
  const key = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  if (!key) return new Response("Not found", { status: 404 });
  const obj = await env.GALLERY_BUCKET.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add functions/api/media
git commit -m "feat(gallery): serve uploaded images from R2"
```

---

### Task 6: Client image resize helper

**Files:**
- Create: `src/lib/imageResize.ts`

- [ ] **Step 1: Implement canvas resize**

```ts
const MAX_EDGE = 1920;
const QUALITY = 0.85;

/** Resize an image File to a JPEG Blob with longest edge <= 1920px. */
export async function resizeImage(file: File): Promise<{ blob: Blob; ext: string }> {
  if (!file.type.startsWith("image/")) throw new Error("not-an-image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
  if (!blob) throw new Error("encode-failed");
  return { blob, ext: "jpg" };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/lib/imageResize.ts
git commit -m "feat(gallery): client-side image resize to 1920/q85"
```

---

### Task 7: Client gallery store (fetch/save/upload + token)

**Files:**
- Create: `src/galleryStore.ts`

Reuse the token helpers from `src/availability.ts` (`getAdminToken`, `setAdminToken`, `clearAdminToken`). Inspect `availability.ts` first and import those rather than duplicating.

- [ ] **Step 1: Implement**

```ts
import type { GalleryManifest, GalleryItem } from "./data/galleryManifest";
import { DEFAULT_MANIFEST } from "./data/galleryManifest";

export type { GalleryManifest, GalleryItem };

export async function fetchManifest(): Promise<GalleryManifest> {
  try {
    const res = await fetch("/api/gallery", { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const body = await res.json();
    if (body && Array.isArray(body.items) && body.items.length > 0) return body as GalleryManifest;
  } catch { /* fall through */ }
  return DEFAULT_MANIFEST;
}

export async function saveManifest(manifest: GalleryManifest, token: string): Promise<GalleryManifest> {
  const res = await fetch("/api/gallery", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(manifest),
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`save-failed:${res.status}`);
  const body = await res.json();
  return body.data as GalleryManifest;
}

export async function uploadImage(blob: Blob, ext: string, token: string): Promise<{ src: string }> {
  const res = await fetch("/api/gallery?upload=1", {
    method: "POST",
    headers: { "content-type": blob.type || "image/jpeg", authorization: `Bearer ${token}`, "x-ext": ext },
    body: blob,
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`upload-failed:${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit` → OK
```bash
git add src/galleryStore.ts
git commit -m "feat(gallery): client store (fetch/save/upload)"
```

---

### Task 8: Public GalleryPage renders from manifest

**Files:**
- Modify: `src/GalleryPage.tsx`

- [ ] **Step 1: Load manifest with fallback**

Add near the other hooks in `GalleryPage`:
```tsx
import { fetchManifest } from "./galleryStore";
import type { GalleryItem } from "./data/galleryManifest";
import { DEFAULT_MANIFEST } from "./data/galleryManifest";
// ...
const [items, setItems] = useState<GalleryItem[]>(DEFAULT_MANIFEST.items);
useEffect(() => {
  let alive = true;
  fetchManifest().then((m) => { if (alive) setItems(m.items); });
  return () => { alive = false; };
}, []);
```

- [ ] **Step 2: Derive views from `items` instead of `MEDIA`**

- `filteredItems` → from `items` (map `GalleryItem` to the shape `MediaThumb`/lightbox expect; `GalleryItem` already has `type/src/poster/caption`). Use `caption` where `alt` was used.
- Opener (`showcaseItems`) → `items.filter(i => i.front !== "off")`, each card `featured={i.front === "big"}`.
- Category sections → `items.filter(i => i.category === cat)`, card `featured={i.front === "big"}`.
- Tab counts → from `items`.
- `GalleryCard`/`MediaThumb` currently read `item.alt`; add a small adapter so they read `caption`. Simplest: give `GalleryCard` items shaped `{ id, type, src, poster?, alt }` and map `alt: caption` at the call site.

- [ ] **Step 3: Verify build + type-check**

Run: `npx tsc --noEmit && npm run build`
Expected: both OK.

- [ ] **Step 4: Manual smoke (local preview)**

Run: `npm run build && npm run preview` (or `npm run dev`). Open `/gallery`.
Expected: With no API locally, it falls back to `DEFAULT_MANIFEST` — opener shows pool (big) first, garden aerial (big), interiors in small boxes; category sections populated; lightbox works.

- [ ] **Step 5: Commit**

```bash
git add src/GalleryPage.tsx
git commit -m "feat(gallery): public page renders from manifest with fallback"
```

---

### Task 9: Admin "Gallery" tab

**Files:**
- Create: `src/components/GalleryAdmin.tsx`
- Modify: `src/AdminPage.tsx` (add tab), `src/styles/AdminPage.css` (grid styles)

- [ ] **Step 1: Build `GalleryAdmin.tsx`**

Component responsibilities (one concern: edit the manifest locally, then save):
- On mount: `fetchManifest()`. If it returns `DEFAULT_MANIFEST` because the server was empty, auto-seed by saving it (so the server has a baseline) — only when a token is available; otherwise just show it and seed on first Save.
- State: `items: GalleryItem[]`, `dirty`, `saving`, `error`.
- Per-item card: thumbnail (`<img src={item.src}>` or poster), category `<select>`, front `<select>` (Off/Big/Small), caption `<input>`, delete button (confirm), and reorder via **Move up / Move down** buttons plus native HTML5 drag (`draggable`, `onDragStart/onDragOver/onDrop` swapping indices).
- Upload zone: `<input type="file" accept="image/*" multiple>`. For each file: `resizeImage(file)` → `uploadImage(blob, ext, token)` → append `{ id: crypto.randomUUID(), type:"image", src, category:"interior", front:"off", caption:"" }`. Show per-file progress/errors.
- Save button: `saveManifest({ items }, token)`; reuse the `ensureToken()` prompt pattern from `AdminPage`.

Use exact handler names: `move(i, dir)`, `setField(i, field, value)`, `removeItem(i)`, `onUploadFiles(files)`, `save()`.

```tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchManifest, saveManifest, uploadImage, type GalleryItem } from "../galleryStore";
import { getAdminToken, setAdminToken, clearAdminToken } from "../availability";
import { resizeImage } from "../lib/imageResize";

const CATS: GalleryItem["category"][] = ["interior", "exterior", "construction"];
const FRONTS: GalleryItem["front"][] = ["off", "big", "small"];

export default function GalleryAdmin() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(0);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchManifest().then((m) => { if (alive) { setItems(m.items); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  function ensureToken(): string | null {
    let token = getAdminToken();
    if (!token) {
      const entered = window.prompt("Admin token:");
      if (!entered) return null;
      token = entered.trim(); setAdminToken(token);
    }
    return token;
  }

  const setField = (i: number, field: keyof GalleryItem, value: string) =>
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const move = (i: number, dir: -1 | 1) =>
    setItems((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = p.slice(); [next[i], next[j]] = [next[j], next[i]]; return next;
    });

  const removeItem = (i: number) =>
    setItems((p) => window.confirm("Remove this photo from the gallery?") ? p.filter((_, idx) => idx !== i) : p);

  const drop = (to: number) =>
    setItems((p) => {
      const from = dragFrom.current; dragFrom.current = null;
      if (from === null || from === to) return p;
      const next = p.slice(); const [m] = next.splice(from, 1); next.splice(to, 0, m); return next;
    });

  const onUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = ensureToken(); if (!token) return;
    setError(null);
    for (const file of Array.from(files)) {
      setBusy((b) => b + 1);
      try {
        const { blob, ext } = await resizeImage(file);
        const { src } = await uploadImage(blob, ext, token);
        setItems((p) => [...p, { id: crypto.randomUUID(), type: "image", src, category: "interior", front: "off", caption: "" }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "upload-failed";
        if (msg === "unauthorized") { clearAdminToken(); setError("Token rejected. Try uploading again."); }
        else setError(`Upload failed (${msg}).`);
      } finally { setBusy((b) => b - 1); }
    }
  }, []);

  async function save() {
    const token = ensureToken(); if (!token) return;
    setSaving(true); setError(null);
    try {
      const fresh = await saveManifest({ items }, token);
      setItems(fresh.items); setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "save-failed";
      if (msg === "unauthorized") { clearAdminToken(); setError("Token rejected. Click Save again."); }
      else setError(`Could not save (${msg}).`);
    } finally { setSaving(false); }
  }

  if (loading) return <p className="admin-empty">Loading gallery…</p>;

  return (
    <section className="gadmin">
      <div className="gadmin__bar">
        <label className="admin-btn admin-btn--add">
          {busy > 0 ? `Uploading… (${busy})` : "+ Upload photos"}
          <input type="file" accept="image/*" multiple hidden
            onChange={(e) => { onUploadFiles(e.target.files); e.currentTarget.value = ""; }} />
        </label>
        <span className="gadmin__count">{items.length} items</span>
        <button className="admin-btn admin-btn--save" onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
      {error && <p className="admin-enquiries__error" role="alert">{error}</p>}
      <p className="admin-save__hint">Drag a card (or use ↑ ↓) to reorder. “Front” controls the “A First Look” opener. Save publishes to the live site.</p>

      <div className="gadmin__grid">
        {items.map((it, i) => (
          <article key={it.id} className="gadmin__card"
            draggable onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)}>
            <div className="gadmin__thumb">
              <img src={it.type === "video" ? (it.poster || it.src) : it.src} alt={it.caption} loading="lazy" />
              {it.type === "video" && <span className="gadmin__vid">video</span>}
            </div>
            <div className="gadmin__row">
              <button className="gadmin__mini" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button className="gadmin__mini" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button className="gadmin__mini gadmin__mini--del" onClick={() => removeItem(i)} aria-label="Remove">✕</button>
            </div>
            <label className="gadmin__field"><span>Tab</span>
              <select value={it.category} onChange={(e) => setField(i, "category", e.target.value)}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="gadmin__field"><span>Front</span>
              <select value={it.front} onChange={(e) => setField(i, "front", e.target.value)}>
                {FRONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="gadmin__field"><span>Caption</span>
              <input value={it.caption} onChange={(e) => setField(i, "caption", e.target.value)} maxLength={300} />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire the tab into `AdminPage.tsx`**

Add `"gallery"` to the `tab` union, a third tab button labelled "Gallery", and render `<GalleryAdmin />` when `tab === "gallery"`. Import it at top.

- [ ] **Step 3: Add styles to `src/styles/AdminPage.css`**

```css
.gadmin{ display:flex; flex-direction:column; gap:16px }
.gadmin__bar{ display:flex; align-items:center; gap:16px; flex-wrap:wrap }
.gadmin__count{ color:var(--muted); font-size:.9rem }
.gadmin__grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:16px }
.gadmin__card{ border:1px solid rgba(226,232,240,.7); border-radius:12px; padding:10px; background:#fff; display:flex; flex-direction:column; gap:8px; cursor:grab }
.gadmin__thumb{ position:relative; aspect-ratio:4/3; border-radius:8px; overflow:hidden; background:#eee }
.gadmin__thumb img{ width:100%; height:100%; object-fit:cover; display:block }
.gadmin__vid{ position:absolute; top:6px; left:6px; background:rgba(0,0,0,.6); color:#fff; font-size:.65rem; padding:2px 6px; border-radius:4px }
.gadmin__row{ display:flex; gap:6px }
.gadmin__mini{ flex:1; border:1px solid rgba(226,232,240,.9); background:#fafafa; border-radius:6px; padding:4px; cursor:pointer }
.gadmin__mini--del{ color:#b00; flex:0 0 auto; padding:4px 8px }
.gadmin__field{ display:flex; flex-direction:column; gap:2px; font-size:.75rem; color:var(--muted) }
.gadmin__field select, .gadmin__field input{ font-size:.85rem; padding:4px 6px; border:1px solid rgba(226,232,240,.9); border-radius:6px }
```

- [ ] **Step 4: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both OK.

- [ ] **Step 5: Commit**

```bash
git add src/components/GalleryAdmin.tsx src/AdminPage.tsx src/styles/AdminPage.css
git commit -m "feat(gallery): admin Gallery tab (upload/reorder/delete/edit)"
```

---

### Task 10: Cloudflare bindings + live verification

**Files:**
- Create: `docs/CLOUDFLARE-GALLERY-SETUP.md`

- [ ] **Step 1: Document the bindings**

In Cloudflare Pages → project → Settings → Functions:
- KV namespace: create `verde-gallery`, bind as variable name **`GALLERY`**.
- R2 bucket: create `verde-gallery`, bind as variable name **`GALLERY_BUCKET`**.
- Env var `ADMIN_TOKEN` already set (reused).
Note: enabling R2 on the account is free under the free tier; may require a card on file.

- [ ] **Step 2: Deploy**

Push to the repo (auto-deploys via Cloudflare Pages). `gh auth switch --user dirvass` before push.

- [ ] **Step 3: Live verification (with cache-buster)**

- `GET https://verde-ulasli.com/api/gallery` → returns JSON `{ items: [...] }` (empty `{items:[]}` until first admin save).
- Open `/admin` → Gallery tab → it auto-shows the seeded photos. Reorder one, change a Front to "big", edit a caption, upload a test photo → Save → "Saved ✓".
- Open `/gallery?cb=1` in a fresh/incognito window → confirms the change is live (opener reflects Front changes; uploaded photo appears in its tab). Use `?cb=` to bypass the SPA edge cache.
- Delete the test photo → Save → gone on reload.
- Simulate API failure isn't needed live; fallback already verified locally in Task 8.

- [ ] **Step 4: Commit setup doc**

```bash
git add docs/CLOUDFLARE-GALLERY-SETUP.md
git commit -m "docs: Cloudflare gallery bindings setup"
```

---

## Self-Review

**Spec coverage:**
- Upload (auto-optimised) → Tasks 6, 7, 9. ✓
- Reorder/delete/category/front/caption → Task 9. ✓
- Live for visitors → Tasks 4, 8. ✓
- Fallback never-broken → Tasks 7, 8. ✓
- Seed from current MEDIA → Task 3. ✓
- R2 storage + serving → Tasks 4, 5. ✓
- Manifest in KV + validation → Tasks 2, 4. ✓
- Bearer auth (constant-time) → Task 4. ✓
- Videos managed-but-not-uploadable → Task 3 seeds videos; Task 9 only uploads images; videos render via poster. ✓
- Bindings setup → Task 10. ✓
- Cost €0 → free tiers (Task 10 note). ✓

**Placeholder scan:** No TBD/TODO; code shown for every code step. Task 8 Step 2 describes edits in prose with exact targets (acceptable — it is a refactor of an existing file whose full source is in the repo; the engineer edits in place).

**Type consistency:** `GalleryItem`/`GalleryManifest`/`Front`/`Category` defined in Task 2, re-exported in Task 3, consumed in 7/8/9. Handler names `move/setField/removeItem/onUploadFiles/save/drop` consistent within Task 9. KV key `manifest`, bindings `GALLERY`/`GALLERY_BUCKET`/`ADMIN_TOKEN` consistent across Tasks 4/5/10.

**Open follow-up:** Task 8 Step 2 should keep `GalleryCard`'s existing `featured` prop (added earlier) — pass `featured={item.front === "big"}`.
