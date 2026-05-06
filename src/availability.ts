/** Shared availability store.
 *
 *  Source of truth: Cloudflare KV via /api/availability (Pages Function).
 *  localStorage acts as an offline cache so first-paint is instant and the
 *  booking page still renders if the API is briefly unreachable.
 */

export type VillaKey = "ALYA" | "ZEHRA";
export type BookedRange = { from: string; to: string }; // ISO date strings YYYY-MM-DD

const STORAGE_KEY = "verde-booked";
const VILLA_KEYS: VillaKey[] = ["ALYA", "ZEHRA"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const API_URL = "/api/availability";
const ADMIN_TOKEN_KEY = "verde-admin-token";

function defaults(): Record<VillaKey, BookedRange[]> {
  return { ALYA: [], ZEHRA: [] };
}

function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

function isValidRange(r: unknown): r is BookedRange {
  return typeof r === "object" && r !== null
    && isValidIsoDate((r as { from?: unknown }).from)
    && isValidIsoDate((r as { to?: unknown }).to);
}

function validate(input: unknown): Record<VillaKey, BookedRange[]> | null {
  if (typeof input !== "object" || input === null) return null;
  const out: Record<VillaKey, BookedRange[]> = { ALYA: [], ZEHRA: [] };
  for (const k of VILLA_KEYS) {
    const arr = (input as Record<string, unknown>)[k];
    if (!Array.isArray(arr)) return null;
    for (const r of arr) {
      if (isValidRange(r)) out[k].push({ from: r.from, to: r.to });
    }
  }
  return out;
}

function readCache(): Record<VillaKey, BookedRange[]> {
  if (typeof localStorage === "undefined") return defaults();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaults();
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return defaults(); }
  return validate(parsed) ?? defaults();
}

function writeCache(data: Record<VillaKey, BookedRange[]>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* swallow */ }
}

/** Synchronous accessor — returns the latest cached value. Use this for first paint. */
export function getBooked(): Record<VillaKey, BookedRange[]> {
  return readCache();
}

/** Fetch from server, update the local cache, return fresh data.
 *  Falls back to the cached value on network error. */
export async function fetchBooked(): Promise<Record<VillaKey, BookedRange[]>> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const validated = validate(json);
    if (!validated) throw new Error("invalid-payload");
    writeCache(validated);
    return validated;
  } catch {
    return readCache();
  }
}

/** Admin write — POSTs to API with Bearer token. Returns saved data on success.
 *  Throws with a status-coded error on auth/validation/network failure. */
export async function saveBooked(
  data: Record<VillaKey, BookedRange[]>,
  token: string,
): Promise<Record<VillaKey, BookedRange[]>> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`save-failed:${res.status}`);
  const body = await res.json();
  const validated = validate(body?.data);
  if (!validated) throw new Error("invalid-response");
  writeCache(validated);
  return validated;
}

export function getAdminToken(): string {
  try { return localStorage.getItem(ADMIN_TOKEN_KEY) || ""; } catch { return ""; }
}

export function setAdminToken(token: string) {
  try { localStorage.setItem(ADMIN_TOKEN_KEY, token); } catch { /* swallow */ }
}

export function clearAdminToken() {
  try { localStorage.removeItem(ADMIN_TOKEN_KEY); } catch { /* swallow */ }
}

/** Convert stored ISO strings to Date objects for DayPicker */
export function toDateRanges(ranges: BookedRange[]): { from: Date; to: Date }[] {
  return ranges
    .map(r => ({ from: new Date(r.from), to: new Date(r.to) }))
    .filter(r => !Number.isNaN(r.from.getTime()) && !Number.isNaN(r.to.getTime()));
}
