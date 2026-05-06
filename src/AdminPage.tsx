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

async function fetchEnquiries(token: string): Promise<Enquiry[]> {
  const res = await fetch("/api/enquiry", { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`fetch-failed:${res.status}`);
  const body = await res.json();
  return Array.isArray(body?.items) ? body.items : [];
}

async function deleteEnquiry(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/enquiry?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`delete-failed:${res.status}`);
}

export default function AdminPage() {
  const [tab, setTab] = useState<"availability" | "enquiries">("availability");
  const [data, setData] = useState(() => getBooked());
  const [heroVis, setHeroVis] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enqLoading, setEnqLoading] = useState(false);
  const [enqError, setEnqError] = useState<string | null>(null);
  const [enqLoaded, setEnqLoaded] = useState(false);

  async function ensureToken(): Promise<string | null> {
    let token = getAdminToken();
    if (!token) {
      const entered = window.prompt("Admin token:");
      if (!entered) return null;
      token = entered.trim();
      setAdminToken(token);
    }
    return token;
  }

  async function loadEnquiries() {
    const token = await ensureToken();
    if (!token) return;
    setEnqLoading(true);
    setEnqError(null);
    try {
      const items = await fetchEnquiries(token);
      setEnquiries(items);
      setEnqLoaded(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "fetch-failed";
      if (msg === "unauthorized") { clearAdminToken(); setEnqError("Token rejected. Click again to re-enter."); }
      else setEnqError(`Could not load (${msg}).`);
    } finally {
      setEnqLoading(false);
    }
  }

  async function removeEnquiry(id: string) {
    if (!confirm(`Delete enquiry ${id}? This cannot be undone.`)) return;
    const token = await ensureToken();
    if (!token) return;
    try {
      await deleteEnquiry(id, token);
      setEnquiries(prev => prev.filter(e => e.reference !== id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "delete-failed";
      if (msg === "unauthorized") { clearAdminToken(); setEnqError("Token rejected. Click again to re-enter."); }
      else setEnqError(`Could not delete (${msg}).`);
    }
  }

  useEffect(() => {
    if (tab === "enquiries" && !enqLoaded && !enqLoading) loadEnquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
        {/* Tabs */}
        <div className="admin-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "availability"}
            className={`admin-tab ${tab === "availability" ? "admin-tab--active" : ""}`}
            onClick={() => setTab("availability")}
          >
            Availability
          </button>
          <button
            role="tab"
            aria-selected={tab === "enquiries"}
            className={`admin-tab ${tab === "enquiries" ? "admin-tab--active" : ""}`}
            onClick={() => setTab("enquiries")}
          >
            Enquiries{enqLoaded ? ` (${enquiries.length})` : ""}
          </button>
        </div>

        {tab === "availability" && (<>
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
        </>)}

        {tab === "enquiries" && (
          <section className="admin-enquiries">
            <div className="admin-enquiries__head">
              <h2 className="admin-enquiries__title">Enquiries</h2>
              <button className="admin-btn admin-btn--add" onClick={loadEnquiries} disabled={enqLoading}>
                {enqLoading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {enqError && <p className="admin-enquiries__error" role="alert">{enqError}</p>}

            {enqLoaded && enquiries.length === 0 && !enqError && (
              <p className="admin-empty">No enquiries yet.</p>
            )}

            <div className="admin-enquiries__list">
              {enquiries.map(e => (
                <article key={e.reference} className="admin-enq">
                  <div className="admin-enq__head">
                    <span className="admin-enq__ref">{e.reference}</span>
                    <span className="admin-enq__when">{new Date(e.createdAt).toLocaleString()}</span>
                    <button
                      type="button"
                      className="admin-btn admin-btn--del"
                      aria-label={`Delete ${e.reference}`}
                      onClick={() => removeEnquiry(e.reference)}
                    >×</button>
                  </div>
                  <div className="admin-enq__grid">
                    <div><span>Villa</span><strong>{e.villa}</strong></div>
                    <div><span>Dates</span><strong>{e.checkIn} → {e.checkOut} ({e.nights}n)</strong></div>
                    <div><span>Name</span><strong>{e.name}</strong></div>
                    <div><span>Email</span><strong><a href={`mailto:${e.email}`}>{e.email}</a></strong></div>
                    <div><span>Phone</span><strong><a href={`tel:${e.phone}`}>{e.phone}</a></strong></div>
                    <div><span>Guests</span><strong>{e.guests}</strong></div>
                  </div>
                  {e.note && <p className="admin-enq__note">{e.note}</p>}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
