/**
 * Cloudflare Pages Function — enquiry submission API
 *
 * POST /api/enquiry        → public, validates, stores in KV, fires-and-forgets to Apps Script
 * GET  /api/enquiry        → admin only (Bearer ADMIN_TOKEN), returns list of enquiries (newest first)
 * DELETE /api/enquiry?id=X → admin only, removes one enquiry
 *
 * Bindings:
 *   - KV namespace AVAILABILITY (we re-use the same one with key prefix `enquiry:`)
 *   - Env vars ADMIN_TOKEN, APPS_SCRIPT_URL, APPS_SCRIPT_SECRET
 */

interface Env {
  AVAILABILITY: KVNamespace;
  ADMIN_TOKEN: string;
  APPS_SCRIPT_URL: string;
  APPS_SCRIPT_SECRET: string;
}

type Enquiry = {
  reference: string;
  villa: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  createdAt: string;
};

const KEY_PREFIX = "enquiry:";
const INDEX_KEY = "enquiry-index";
const MAX_ENQUIRIES = 1000;

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
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

function generateReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "VRD-";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function isString(v: unknown): v is string { return typeof v === "string"; }

function trimStr(v: unknown, max: number): string {
  if (!isString(v)) return "";
  return v.trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function adminAuthOk(env: Env, request: Request): boolean {
  const expected = env.ADMIN_TOKEN || "";
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!expected || !token || token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

async function readIndex(env: Env): Promise<string[]> {
  const raw = await env.AVAILABILITY.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === "string") : [];
  } catch { return []; }
}

async function writeIndex(env: Env, ids: string[]): Promise<void> {
  await env.AVAILABILITY.put(INDEX_KEY, JSON.stringify(ids));
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const onRequestPost: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "invalid-json" }, { status: 400 }); }

  // Honeypot — bots fill every field
  if (typeof body?.company === "string" && body.company.length > 0) {
    return json({ ok: true, reference: "VRD-IGNORED" });
  }

  const villa = trimStr(body?.villa, 16);
  if (villa !== "ALYA" && villa !== "ZEHRA") return json({ error: "invalid-villa" }, { status: 400 });

  const checkIn  = trimStr(body?.checkIn, 32);
  const checkOut = trimStr(body?.checkOut, 32);
  if (!ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) return json({ error: "invalid-dates" }, { status: 400 });
  if (checkIn >= checkOut) return json({ error: "invalid-range" }, { status: 400 });

  const name  = trimStr(body?.name, 120);
  const email = trimStr(body?.email, 200);
  const phone = trimStr(body?.phone, 60);
  if (name.length < 2)            return json({ error: "name-required" }, { status: 400 });
  if (!EMAIL_RE.test(email))      return json({ error: "email-invalid" }, { status: 400 });
  if (phone.length < 5)           return json({ error: "phone-required" }, { status: 400 });

  const guests = trimStr(body?.guests, 80) || "—";
  const note   = trimStr(body?.note, 2000);

  const nights = Number.isFinite(body?.nights) ? Math.max(0, Math.min(120, Math.floor(body.nights))) : 0;

  const reference = generateReference();
  const enq: Enquiry = {
    reference, villa, checkIn, checkOut, nights, guests, name, email, phone, note,
    createdAt: new Date().toISOString(),
  };

  // Persist
  await env.AVAILABILITY.put(KEY_PREFIX + reference, JSON.stringify(enq));
  const idx = await readIndex(env);
  idx.unshift(reference);
  if (idx.length > MAX_ENQUIRIES) {
    const drop = idx.slice(MAX_ENQUIRIES);
    await Promise.all(drop.map(r => env.AVAILABILITY.delete(KEY_PREFIX + r)));
    idx.length = MAX_ENQUIRIES;
  }
  await writeIndex(env, idx);

  // Fire-and-forget to Apps Script — keep the handler alive until the call lands.
  if (env.APPS_SCRIPT_URL && env.APPS_SCRIPT_SECRET) {
    const payload = {
      secret: env.APPS_SCRIPT_SECRET,
      enquiry: { reference, villa, checkIn, checkOut, nights, guests, name, email, phone, note },
    };
    waitUntil(
      fetch(env.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "follow",
      }).then(() => undefined).catch(() => undefined),
    );
  }

  return json({ ok: true, reference });
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  if (!adminAuthOk(env, request)) return json({ error: "unauthorized" }, { status: 401 });
  const idx = await readIndex(env);
  const items = await Promise.all(
    idx.slice(0, 200).map(async r => {
      const raw = await env.AVAILABILITY.get(KEY_PREFIX + r);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    })
  );
  return json({ items: items.filter(Boolean) });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  if (!adminAuthOk(env, request)) return json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id || !/^VRD-[A-Z0-9]+$/.test(id)) return json({ error: "invalid-id" }, { status: 400 });

  await env.AVAILABILITY.delete(KEY_PREFIX + id);
  const idx = await readIndex(env);
  const next = idx.filter(x => x !== id);
  if (next.length !== idx.length) await writeIndex(env, next);

  return json({ ok: true });
};
