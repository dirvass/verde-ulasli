/**
 * Cloudflare Pages Function — availability API
 *
 * GET  /api/availability        → public, returns { ALYA, ZEHRA } JSON
 * POST /api/availability        → admin only, body: { ALYA, ZEHRA }
 *
 * Bindings (set in Cloudflare Pages → Settings → Functions):
 *   - KV namespace bound as AVAILABILITY
 *   - Environment variable ADMIN_TOKEN (string, kept secret — used as Bearer)
 */

interface Env {
  AVAILABILITY: KVNamespace;
  ADMIN_TOKEN: string;
}

type BookedRange = { from: string; to: string };
type Payload = { ALYA: BookedRange[]; ZEHRA: BookedRange[] };

const KV_KEY = "bookings";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VILLA_KEYS: (keyof Payload)[] = ["ALYA", "ZEHRA"];

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-max-age": "86400",
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

function isValidRange(r: unknown): r is BookedRange {
  if (typeof r !== "object" || r === null) return false;
  const o = r as Record<string, unknown>;
  if (typeof o.from !== "string" || typeof o.to !== "string") return false;
  if (!ISO_DATE.test(o.from) || !ISO_DATE.test(o.to)) return false;
  if (o.from > o.to) return false;
  return true;
}

function validatePayload(input: unknown): Payload | null {
  if (typeof input !== "object" || input === null) return null;
  const out: Payload = { ALYA: [], ZEHRA: [] };
  for (const v of VILLA_KEYS) {
    const arr = (input as Record<string, unknown>)[v];
    if (!Array.isArray(arr)) return null;
    if (arr.length > 500) return null;
    for (const r of arr) {
      if (!isValidRange(r)) return null;
      out[v].push({ from: r.from, to: r.to });
    }
  }
  return out;
}

async function readKV(env: Env): Promise<Payload> {
  const raw = await env.AVAILABILITY.get(KV_KEY);
  if (!raw) return { ALYA: [], ZEHRA: [] };
  const parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  return validatePayload(parsed) ?? { ALYA: [], ZEHRA: [] };
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const data = await readKV(env);
  return json(data);
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return json({ error: "server-misconfigured" }, { status: 500 });

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token.length === 0 || token.length !== expected.length) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  if (diff !== 0) return json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid-json" }, { status: 400 }); }
  const payload = validatePayload(body);
  if (!payload) return json({ error: "invalid-payload" }, { status: 400 });

  await env.AVAILABILITY.put(KV_KEY, JSON.stringify(payload));
  return json({ ok: true, data: payload });
};
