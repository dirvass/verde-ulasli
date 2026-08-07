/**
 * Cloudflare Pages Function — live CAPEX data from the expenses Google Sheet
 *
 * GET /api/capex → parses the sheet's CSV export into the same shape as
 * src/data/capex.json. Edge-cached 5 minutes. Any failure returns 5xx and
 * the page falls back to its bundled snapshot.
 *
 * Env vars:
 *   - CAPEX_SHEET_ID  (Google Sheets document id; repo is public, keep it here)
 */

interface Env {
  CAPEX_SHEET_ID: string;
}

type Expense = {
  item: string;
  date: string;
  tl: number;
  eurRate: number;
  eur: number;
  status: "paid";
  partners: number[];
};

type Forecast = { item: string; tl: number; eurRate: number; eur: number };

const CACHE_SECONDS = 300;

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });
}

/* ── CSV parsing ─────────────────────────────────────────── */

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function num(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[€₺%\s]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Accepts "26 Aug 2023" and "3/12/25" (day/month/2-digit-year). */
function parseDate(s: string): string | null {
  s = s.trim();
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (!mo) return null;
    return `${m[3]}-${String(mo).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) return `20${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/* ── Sheet → capex.json shape ────────────────────────────── */

// Column layout: A item, B date, C TL, D rate, F EUR, J–M partner amounts.
const COL = { item: 0, date: 1, tl: 2, rate: 3, eur: 5, partners: [9, 10, 11, 12] };

export function buildCapex(csv: string) {
  const rows = parseCSV(csv);
  if (rows.length < 3) throw new Error("too-few-rows");

  const header = rows[0];
  const shareRow = rows[1];
  const partners = COL.partners.map((c) => ({
    name: (header[c] || "").trim(),
    share: num(shareRow[c]),
  }));

  const expenses: Expense[] = [];
  const forecast: Forecast[] = [];
  let section: "paid" | "between" | "forecast" | "done" = "paid";

  for (const r of rows.slice(2)) {
    const item = (r[COL.item] || "").trim();
    if (!item) continue;
    if (item.startsWith("Ödenen")) { section = "between"; continue; }
    if (item === "Öngörü") { section = "forecast"; continue; }
    if (item.startsWith("Öngörü toplam") || item === "Total") { section = "done"; continue; }

    if (section === "paid") {
      const date = parseDate(r[COL.date] || "");
      if (!date) continue; // malformed row — sheet still being edited
      expenses.push({
        item,
        date,
        tl: num(r[COL.tl]),
        eurRate: num(r[COL.rate]),
        eur: Math.round(num(r[COL.eur]) * 10) / 10,
        status: "paid", // everything above the paid subtotal counts as paid
        partners: COL.partners.map((c) => num(r[c])),
      });
    } else if (section === "forecast") {
      const tl = num(r[COL.tl]);
      if (tl <= 0) continue;
      forecast.push({
        item,
        tl,
        eurRate: num(r[COL.rate]),
        eur: Math.round(num(r[COL.eur]) * 10) / 10,
      });
    }
  }

  const paidTL = expenses.reduce((a, e) => a + e.tl, 0);
  const paidEUR = expenses.reduce((a, e) => a + e.eur, 0);
  const forecastTL = forecast.reduce((a, f) => a + f.tl, 0);
  const forecastEUR = forecast.reduce((a, f) => a + f.eur, 0);

  // The standalone Mobilya line is already inside "İnce inşaat, incl mobilya",
  // so the grand total excludes it — same convention as the sheet's Total row.
  const mobilya = forecast.find((f) => f.item.toLowerCase().startsWith("mobilya"));
  const totalTL = paidTL + forecastTL - (mobilya?.tl ?? 0);
  const totalEUR = paidEUR + forecastEUR - (mobilya?.eur ?? 0);

  // Sanity checks — a format change must fall back, not render garbage.
  const shareSum = partners.reduce((a, p) => a + p.share, 0);
  if (expenses.length < 50) throw new Error("too-few-expenses");
  if (shareSum < 99 || shareSum > 101) throw new Error("bad-shares");
  if (partners.some((p) => !p.name)) throw new Error("bad-partner-names");
  if (!Number.isFinite(totalEUR) || totalEUR <= 0) throw new Error("bad-totals");

  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    partners,
    expenses,
    forecast,
    totals: {
      paidTL,
      paidEUR: r1(paidEUR),
      forecastTL,
      forecastEUR: r1(forecastEUR),
      totalTL,
      totalEUR: r1(totalEUR),
    },
  };
}

/* ── Handler ─────────────────────────────────────────────── */

export const onRequestGet: PagesFunction<Env> = async ({ env, request, waitUntil }) => {
  if (!env.CAPEX_SHEET_ID) return json({ error: "not-configured" }, { status: 503 });

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(new URL("/api/capex", request.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const csvUrl =
    `https://docs.google.com/spreadsheets/d/${env.CAPEX_SHEET_ID}/export?format=csv&gid=0`;

  let csv: string;
  try {
    const res = await fetch(csvUrl, { redirect: "follow" });
    if (!res.ok) return json({ error: "sheet-unreachable" }, { status: 502 });
    csv = await res.text();
  } catch {
    return json({ error: "sheet-unreachable" }, { status: 502 });
  }

  let data: ReturnType<typeof buildCapex>;
  try {
    data = buildCapex(csv);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "parse-failed" }, { status: 502 });
  }

  const response = json(data, {
    headers: { "cache-control": `public, max-age=${CACHE_SECONDS}` },
  });
  waitUntil(cache.put(cacheKey, response.clone()));
  return response;
};
