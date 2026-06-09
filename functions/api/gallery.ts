/**
 * Cloudflare Pages Function — gallery API
 *
 * GET  /api/gallery              → public, returns { items } manifest JSON
 * POST /api/gallery              → admin only, body: { items } (full manifest)
 * POST /api/gallery?upload=1     → admin only, body: raw image bytes → R2
 *
 * Bindings (Cloudflare Pages → Settings → Functions):
 *   - KV namespace bound as GALLERY
 *   - R2 bucket bound as GALLERY_BUCKET
 *   - Environment variable ADMIN_TOKEN (Bearer, kept secret)
 *
 * Validator is self-contained here (mirrors the client validator in
 * src/data/galleryTypes.ts), matching the pattern used by availability.ts.
 */

interface Env {
  GALLERY: KVNamespace;
  GALLERY_BUCKET: R2Bucket;
  ADMIN_TOKEN: string;
}

type Category = "interior" | "exterior" | "construction";
type Front = "off" | "big" | "small";
interface GalleryItem {
  id: string; type: "image" | "video"; src: string; poster?: string;
  category: Category; front: Front; caption: string;
}
interface Manifest { items: GalleryItem[] }

const KV_KEY = "manifest";
const MAX_UPLOAD = 6 * 1024 * 1024; // 6 MB backstop (client already resizes)
const MAX_ITEMS = 600;
const MAX_CAPTION = 300;
const CATEGORIES: Category[] = ["interior", "exterior", "construction"];
const FRONTS: Front[] = ["off", "big", "small"];

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, x-ext",
  "access-control-max-age": "86400",
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...cors,
      ...(init.headers || {}),
    },
  });
}

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
    id: o.id, type: o.type, src: o.src as string,
    category: o.category as Category, front: o.front as Front,
    caption: cleanCaption(o.caption),
  };
  if (o.poster !== undefined) {
    if (!safeSrc(o.poster)) return null;
    item.poster = o.poster as string;
  }
  return item;
}
function validateManifest(input: unknown): Manifest | null {
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

function authorized(request: Request, env: Env): boolean {
  const expected = env.ADMIN_TOKEN || "";
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || token.length === 0 || token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

async function readManifest(env: Env): Promise<Manifest> {
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
  if (!authorized(request, env)) return json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);

  // Upload branch — raw image bytes stored in R2.
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

  // Save branch — full manifest.
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid-json" }, { status: 400 }); }
  const manifest = validateManifest(body);
  if (!manifest) return json({ error: "invalid-manifest" }, { status: 400 });
  await env.GALLERY.put(KV_KEY, JSON.stringify(manifest));
  return json({ ok: true, data: manifest });
};
