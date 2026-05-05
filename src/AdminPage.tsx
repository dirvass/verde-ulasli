import React, { useMemo, useState, useEffect } from "react";
import TopNav from "./components/TopNav";
import {
  getBooked, fetchBooked, saveBooked,
  getAdminToken, setAdminToken, clearAdminToken,
  VillaKey, BookedRange,
} from "./availability";
import "./styles/AdminPage.css";

const VILLAS: VillaKey[] = ["ALYA", "ZEHRA"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type RangeIssue = "empty" | "past" | "reversed" | "overlap" | "ok";

function rangeIssue(r: BookedRange, others: BookedRange[]): RangeIssue {
  if (!r.from || !r.to) return "empty";
  const today = todayIso();
  if (r.to < today) return "past";
  if (r.from > r.to) return "reversed";
  for (const o of others) {
    if (!o.from || !o.to) continue;
    if (!(r.to < o.from || o.to < r.from)) return "overlap";
  }
  return "ok";
}

export default function AdminPage() {
  const [data, setData] = useState(() => getBooked());
  const [heroVis, setHeroVis] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setHeroVis(true), 100); return () => clearTimeout(t); }, []);

  // Load latest from server on mount.
  useEffect(() => {
    let alive = true;
    fetchBooked()
      .then(d => { if (alive) setData(d); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const issues = useMemo(() => {
    const out: Record<VillaKey, RangeIssue[]> = { ALYA: [], ZEHRA: [] };
    for (const v of VILLAS) {
      out[v] = data[v].map((r, i) => rangeIssue(r, data[v].filter((_, j) => j !== i)));
    }
    return out;
  }, [data]);

  const hasBlocking = VILLAS.some(v => issues[v].some(i => i === "past" || i === "reversed" || i === "overlap"));

  function addRange(villa: VillaKey) {
    setData(prev => ({ ...prev, [villa]: [...prev[villa], { from: "", to: "" }] }));
    setSaved(false); setError(null);
  }

  function updateRange(villa: VillaKey, idx: number, field: "from" | "to", value: string) {
    setData(prev => ({
      ...prev,
      [villa]: prev[villa].map((r, i) => i === idx ? { ...r, [field]: value } : r),
    }));
    setSaved(false); setError(null);
  }

  function removeRange(villa: VillaKey, idx: number) {
    setData(prev => ({ ...prev, [villa]: prev[villa].filter((_, i) => i !== idx) }));
    setSaved(false); setError(null);
  }

  async function save() {
    const cleaned: Record<VillaKey, BookedRange[]> = { ALYA: [], ZEHRA: [] };
    for (const v of VILLAS) cleaned[v] = data[v].filter(r => r.from && r.to);

    let token = getAdminToken();
    if (!token) {
      const entered = window.prompt("Admin token (set in Cloudflare Pages → Settings → Environment variables):");
      if (!entered) return;
      token = entered.trim();
      setAdminToken(token);
    }

    setSaving(true); setError(null);
    try {
      const fresh = await saveBooked(cleaned, token);
      setData(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "save-failed";
      if (msg === "unauthorized") {
        clearAdminToken();
        setError("Token rejected. Click Save again to re-enter.");
      } else {
        setError(`Could not save (${msg}). Check connection and try again.`);
      }
    } finally {
      setSaving(false);
    }
  }

  const total = VILLAS.reduce((a, v) => a + data[v].length, 0);

  return (
    <>
      <header className={`admin-hero ${heroVis ? "admin-hero--vis" : ""}`}>
        <div className="admin-hero__bg" aria-hidden="true" />
        <div className="admin-hero__ov" aria-hidden="true" />
        <TopNav />
        <div className="admin-hero__ct">
          <span className="admin-hero__badge">Extranet</span>
          <h1 className="admin-hero__title">Availability Manager</h1>
          <div className="admin-hero__line" />
          <p className="admin-hero__sub">Manage booked dates for each villa. Saved to the server and reflected on the booking page for all visitors.</p>
        </div>
      </header>

      <main className="admin">
        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat__label">Total Bookings</span>
            <span className="admin-stat__value">{loading ? "…" : total}</span>
          </div>
          {VILLAS.map(v => (
            <div key={v} className="admin-stat">
              <span className="admin-stat__label">{v}</span>
              <span className="admin-stat__value">{data[v].length} booking{data[v].length !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>

        {VILLAS.map(v => (
          <section key={v} className="admin-villa">
            <div className="admin-villa__head">
              <h2 className="admin-villa__name">{v}</h2>
              <button className="admin-btn admin-btn--add" onClick={() => addRange(v)}>+ Add Booking</button>
            </div>

            {data[v].length === 0 && (
              <p className="admin-empty">No bookings yet. Click "+ Add Booking" to block dates.</p>
            )}

            <div className="admin-ranges">
              {data[v].map((r, i) => {
                const issue = issues[v][i];
                const isBad = issue === "past" || issue === "reversed" || issue === "overlap";
                return (
                  <div key={i} className={`admin-range ${isBad ? "admin-range--error" : ""}`}>
                    <label className="admin-field" htmlFor={`${v}-${i}-from`}>
                      <span>Check-in</span>
                      <input
                        id={`${v}-${i}-from`}
                        type="date"
                        value={r.from}
                        min={todayIso()}
                        onChange={e => updateRange(v, i, "from", e.target.value)}
                      />
                    </label>
                    <span className="admin-range__arrow" aria-hidden="true">&rarr;</span>
                    <label className="admin-field" htmlFor={`${v}-${i}-to`}>
                      <span>Check-out</span>
                      <input
                        id={`${v}-${i}-to`}
                        type="date"
                        value={r.to}
                        min={r.from || todayIso()}
                        onChange={e => updateRange(v, i, "to", e.target.value)}
                      />
                    </label>
                    <button type="button" className="admin-btn admin-btn--del" onClick={() => removeRange(v, i)} aria-label="Remove booking">
                      &#10005;
                    </button>
                    {issue !== "ok" && issue !== "empty" && (
                      <span className="admin-range__issue" role="alert">
                        {issue === "past" && "Range is in the past."}
                        {issue === "reversed" && "Check-out must be after check-in."}
                        {issue === "overlap" && "Overlaps another range for this villa."}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="admin-save">
          <button
            type="button"
            className="admin-btn admin-btn--save"
            onClick={save}
            disabled={hasBlocking || saving}
            aria-disabled={hasBlocking || saving}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </button>
          <p className="admin-save__hint">
            {error
              ? error
              : hasBlocking
                ? "Resolve validation errors above before saving."
                : "Changes are saved to the server and apply to the booking calendar immediately for all visitors."}
          </p>
        </div>
      </main>
    </>
  );
}
