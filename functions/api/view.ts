/**
 * Cloudflare Pages Function — belge görüntüleme sayacı
 *
 * POST /api/view   body: { d: "<slug>" }   → sayacı artırır, 204 döner
 * GET  /api/view   Bearer ADMIN_TOKEN      → tüm sayaçları JSON döner
 *
 * Bindings (Cloudflare Pages → Settings → Functions):
 *   - KV namespace bound as AVAILABILITY   (mevcut binding, "view:" öneki kullanılır)
 *   - Environment variable ADMIN_TOKEN
 *
 * Gizlilik: IP, çerez, parmak izi ve konum saklanmaz. Yalnızca sayaç ve
 * zaman damgası tutulur; bu yüzden çerez onayı gerektirmez ve PostHog'un
 * onay kapısından bağımsız çalışır.
 */

interface Env {
  AVAILABILITY: KVNamespace;
  ADMIN_TOKEN: string;
}

/** İzin verilen belge kimlikleri. Yeni bağlantı = buraya yeni satır. */
const SLUGS = new Set(["koridor", "verde", "talep"]);

const KEY = (slug: string) => `view:${slug}`;
const MAX_STAMPS = 500; // KV değeri sınırsız büyümesin

type Record_ = { count: number; last: string | null; stamps: string[] };

const EMPTY: Record_ = { count: 0, last: null, stamps: [] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function read(env: Env, slug: string): Promise<Record_> {
  const raw = await env.AVAILABILITY.get(KEY(slug));
  if (!raw) return { ...EMPTY, stamps: [] };
  try {
    const p = JSON.parse(raw) as Partial<Record_>;
    return {
      count: typeof p.count === "number" ? p.count : 0,
      last: typeof p.last === "string" ? p.last : null,
      stamps: Array.isArray(p.stamps) ? p.stamps.filter((s) => typeof s === "string") : [],
    };
  } catch {
    return { ...EMPTY, stamps: [] };
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let slug = "";
  try {
    const body = (await request.json()) as { d?: unknown };
    slug = typeof body.d === "string" ? body.d : "";
  } catch {
    return json({ error: "bad body" }, 400);
  }
  if (!SLUGS.has(slug)) return json({ error: "unknown document" }, 404);

  const rec = await read(env, slug);
  const now = new Date().toISOString();
  rec.count += 1;
  rec.last = now;
  rec.stamps.push(now);
  if (rec.stamps.length > MAX_STAMPS) rec.stamps = rec.stamps.slice(-MAX_STAMPS);

  await env.AVAILABILITY.put(KEY(slug), JSON.stringify(rec));
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return json({ error: "unauthorized" }, 401);
  }
  const out: Record<string, Record_> = {};
  for (const slug of SLUGS) out[slug] = await read(env, slug);
  return json(out);
};
