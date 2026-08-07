import { describe, it, expect } from "vitest";
import { buildCapex } from "./capex";

// Miniature of the real sheet layout: header, share row, paid rows,
// paid subtotal, forecast section, totals. Values are small but the
// conventions (blank Statü still paid, Mobilya excluded from grand
// total, mixed date formats) mirror the live sheet.
function makeCsv(rows: string[][]): string {
  return rows.map((r) => r.join(",")).join("\n");
}

const HEADER = ["Ürün", "Tarih", "TL", "Euro kuru", "", "Euro Tutar", "", "Hisse basi", "Statü", "Abd Diz", "Sacit", "Ahmed", "Mehmet", "Not"];
const SHARES = ["", "", "", "", "", "", "", "", "", "40.00%", "30.00%", "20.00%", "10.00%", "100.00%"];

const paidRow = (item: string, date: string, tl: string, eur: string, status = "Ödendi") =>
  [item, date, tl, "50.000", "", eur, "", "", status, "€10.00", "€10.00", "€10.00", "€10.00", ""];

function fullCsv(overrides?: { shares?: string[]; paidCount?: number }) {
  const rows: string[][] = [HEADER, overrides?.shares ?? SHARES];
  const n = overrides?.paidCount ?? 55;
  for (let i = 0; i < n; i++) {
    rows.push(paidRow(`Kalem ${i}`, "26 Aug 2023", "500", "10.0", i % 3 === 0 ? "" : "Ödendi"));
  }
  rows.push(paidRow("Karışık tarih", "3/12/25", "500", "10.0"));
  rows.push(["Ödenen ara toplam", "", "28000", "", "", "560.0", "", "", "", "", "", "", "", ""]);
  rows.push(["Öngörü", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
  rows.push(["İnce inşaat incl mobilya", "", "1000", "50.000", "", "20.0", "", "", "", "", "", "", "", ""]);
  rows.push(["Mobilya", "", "200", "50.000", "", "4.0", "", "", "", "", "", "", "", ""]);
  rows.push(["Öngörü toplam", "", "1200", "", "", "24.0", "", "", "", "", "", "", "", ""]);
  rows.push(["Total", "", "29000", "", "", "580.0", "", "", "", "", "", "", "", ""]);
  return makeCsv(rows);
}

describe("buildCapex", () => {
  it("parses partners, expenses and forecast from the sheet layout", () => {
    const d = buildCapex(fullCsv());
    expect(d.partners).toEqual([
      { name: "Abd Diz", share: 40 },
      { name: "Sacit", share: 30 },
      { name: "Ahmed", share: 20 },
      { name: "Mehmet", share: 10 },
    ]);
    expect(d.expenses).toHaveLength(56);
    expect(d.forecast).toHaveLength(2);
    // blank Statü above the paid subtotal still counts as paid
    expect(d.expenses.every((e) => e.status === "paid")).toBe(true);
  });

  it("handles both date formats", () => {
    const d = buildCapex(fullCsv());
    expect(d.expenses[0].date).toBe("2023-08-26");
    expect(d.expenses[55].date).toBe("2025-12-03"); // "3/12/25" = d/m/yy
  });

  it("excludes the standalone Mobilya line from the grand total", () => {
    const d = buildCapex(fullCsv());
    expect(d.totals.paidTL).toBe(56 * 500);
    expect(d.totals.forecastTL).toBe(1200);
    expect(d.totals.totalTL).toBe(56 * 500 + 1200 - 200);
    expect(d.totals.totalEUR).toBe(56 * 10 + 24 - 4);
  });

  it("rejects a sheet whose shares no longer sum to ~100%", () => {
    const shares = [...SHARES];
    shares[9] = "5.00%";
    expect(() => buildCapex(fullCsv({ shares }))).toThrow("bad-shares");
  });

  it("rejects a sheet with suspiciously few expense rows", () => {
    expect(() => buildCapex(fullCsv({ paidCount: 10 }))).toThrow("too-few-expenses");
  });

  it("rejects empty or unrelated content (e.g. a Google login page)", () => {
    expect(() => buildCapex("")).toThrow();
    expect(() => buildCapex("<html><body>Sign in</body></html>")).toThrow();
  });
});
