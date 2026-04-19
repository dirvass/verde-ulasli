/** Shared availability store backed by localStorage.
 *  Used by BookingPage (read) and AdminPage (read/write).
 *
 *  NOTE: this is browser-local only. It is not a real multi-device
 *  availability store — writes on one admin device are not visible
 *  on any visitor's browser. Replace with a server-backed store
 *  (Cloudflare KV / D1) before exposing to real customers.
 */

export type VillaKey = "ALYA" | "ZEHRA";
export type BookedRange = { from: string; to: string }; // ISO date strings YYYY-MM-DD

const STORAGE_KEY = "verde-booked";
const VILLA_KEYS: VillaKey[] = ["ALYA", "ZEHRA"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function currentYear(): number {
  return new Date().getFullYear();
}

function defaults(): Record<VillaKey, BookedRange[]> {
  const y = currentYear();
  return {
    ALYA: [
      { from: `${y}-07-12`, to: `${y}-07-18` },
      { from: `${y}-08-03`, to: `${y}-08-07` },
    ],
    ZEHRA: [
      { from: `${y}-08-14`, to: `${y}-08-21` },
    ],
  };
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

function parseStored(raw: string): Record<VillaKey, BookedRange[]> | null {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (typeof parsed !== "object" || parsed === null) return null;

  const out: Record<VillaKey, BookedRange[]> = { ALYA: [], ZEHRA: [] };
  for (const k of VILLA_KEYS) {
    const arr = (parsed as Record<string, unknown>)[k];
    if (!Array.isArray(arr)) return null;
    for (const r of arr) {
      if (isValidRange(r)) out[k].push({ from: r.from, to: r.to });
    }
  }
  return out;
}

export function getBooked(): Record<VillaKey, BookedRange[]> {
  if (typeof localStorage === "undefined") return defaults();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaults();
  const validated = parseStored(raw);
  if (!validated) {
    // Corrupted or tampered entry — clear it and fall back.
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* swallow */ }
    return defaults();
  }
  return validated;
}

export function setBooked(data: Record<VillaKey, BookedRange[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota / privacy-mode — swallow */ }
}

/** Convert stored ISO strings to Date objects for DayPicker */
export function toDateRanges(ranges: BookedRange[]): { from: Date; to: Date }[] {
  return ranges
    .map(r => ({ from: new Date(r.from), to: new Date(r.to) }))
    .filter(r => !Number.isNaN(r.from.getTime()) && !Number.isNaN(r.to.getTime()));
}
