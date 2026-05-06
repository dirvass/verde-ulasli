import TopNav from "./components/TopNav";
import React, { useEffect, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { differenceInCalendarDays, format, isBefore, startOfToday, eachDayOfInterval, isWithinInterval } from "date-fns";
import "react-day-picker/dist/style.css";
import { useLanguage } from "./i18n/LanguageContext";
import { usePageMeta } from "./hooks/usePageMeta";
import { getBooked, fetchBooked, toDateRanges } from "./availability";
import "./styles/BookingPage.css";

/* ── Feature flag: set to true to show pricing breakdown publicly ── */
const SHOW_PRICING = false;

/* ── constants ── */
type VillaKey = "ALYA" | "ZEHRA";

interface VillaData {
  name: string;
  nightlyEUR: number;
  sleeps: number;
  taglineKey: string;
  img: string;
}

const VILLAS: Record<VillaKey, VillaData> = {
  ALYA:  { name: "ALYA",  nightlyEUR: 700, sleeps: 8, taglineKey: "booking.alyaTag", img: "/media/dis-mekan/kus-bakisi-gunduz-ai-render.jpg" },
  ZEHRA: { name: "ZEHRA", nightlyEUR: 550, sleeps: 6, taglineKey: "booking.zehraTag", img: "/media/dis-mekan/havuz-deniz-manzarasi-konsept.jpg" },
};
const VILLA_KEYS: VillaKey[] = ["ALYA", "ZEHRA"];

const CLEANING_FEE = 150;
const SERVICE_FEE_PCT = 0.05;
const EXTRA_GUEST_FEE_EUR = 100;
const INCLUDED_GUESTS = 2;
const CHEF_DINNER_PER_NIGHT = 200;
const QUAD_PER_HOUR = 50;
const TRANSFER_PER_WAY = 100;
const TRANSFER_INCLUDED_NIGHTS = 7;
const MIN_NIGHTS = 3;
const DEPOSIT = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── helpers ── */
function nightsOf(r: DateRange | undefined) {
  if (!r?.from || !r.to) return 0;
  return Math.max(0, differenceInCalendarDays(r.to, r.from));
}
const euro = (v: number) => `\u20AC\u00A0${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const euro0 = (v: number) => `\u20AC\u00A0${v.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
const opt = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/* ── Guest stepper ── */
function GuestStepper({
  id, label, sub, value, min, max, onChange, decLabel, incLabel,
}: {
  id: string;
  label: string;
  sub?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  decLabel: string;
  incLabel: string;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="bk-counter">
      <label htmlFor={id} className="bk-counter__label">
        {label}{sub && <small>{sub}</small>}
      </label>
      <div className="bk-stepper" role="group" aria-label={label}>
        <button
          type="button"
          className="bk-stepper__btn"
          onClick={dec}
          disabled={value <= min}
          aria-label={decLabel}
        >−</button>
        <output id={id} className="bk-stepper__value tnum" aria-live="polite">{value}</output>
        <button
          type="button"
          className="bk-stepper__btn"
          onClick={inc}
          disabled={value >= max}
          aria-label={incLabel}
        >+</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════ */
export default function BookingPage() {
  usePageMeta("meta.bookingTitle", "meta.bookingDesc");
  const { t } = useLanguage();

  const [villa, setVilla] = useState<VillaKey>("ALYA");
  const [range, setRange] = useState<DateRange | undefined>();
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [note, setNote] = useState("");
  const [showVal, setShowVal] = useState(false);
  const [heroVis, setHeroVis] = useState(false);
  const [chef, setChef] = useState(false);
  const [quadH, setQuadH] = useState(0);
  const [transfers, setTransfers] = useState(0);
  const [calMonths, setCalMonths] = useState(1);
  const [bookedData, setBookedData] = useState(() => getBooked());

  // Contact + submission
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState(""); // bots fill every field
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ reference: string } | null>(null);

  useEffect(() => { const tm = setTimeout(() => setHeroVis(true), 100); return () => clearTimeout(tm); }, []);

  // Live availability — fetch from API on mount and when the tab regains focus.
  // Also reflect storage updates from the same browser so admin edits propagate locally.
  useEffect(() => {
    let alive = true;
    const refresh = () => { fetchBooked().then(d => { if (alive) setBookedData(d); }); };
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "verde-booked" || e.key === null) setBookedData(getBooked());
    };
    const onFocus = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const nights = nightsOf(range);
  const vi = VILLAS[villa];
  const party = adults + children;
  const overCap = party > vi.sleeps;
  const underMin = nights > 0 && nights < MIN_NIGHTS;

  const extraG = Math.max(0, party - INCLUDED_GUESTS);
  const base = nights * vi.nightlyEUR;
  const extraFee = nights > 0 ? nights * EXTRA_GUEST_FEE_EUR * extraG : 0;
  const chefTot = chef && nights > 0 ? nights * CHEF_DINNER_PER_NIGHT : 0;
  const quadTot = quadH * QUAD_PER_HOUR;
  const xferInc = nights >= TRANSFER_INCLUDED_NIGHTS;
  const xferTot = xferInc ? 0 : transfers * TRANSFER_PER_WAY;
  const clean = nights > 0 ? CLEANING_FEE : 0;
  const sub = base + extraFee + chefTot + quadTot + xferTot + clean;
  const svc = sub * SERVICE_FEE_PCT;
  const total = sub + svc;

  const today = startOfToday();
  const blockedRanges = toDateRanges(bookedData[villa]);
  const disabled = [{ before: today }, ...blockedRanges];

  // Reject ranges that span across an already-blocked period.
  const crossesBlocked = !!(range?.from && range?.to && blockedRanges.some(b =>
    eachDayOfInterval({ start: range.from!, end: range.to! }).some(d =>
      isWithinInterval(d, { start: b.from, end: b.to })
    )
  ));

  const dateOk = nights >= MIN_NIGHTS && !crossesBlocked;
  const guestsOk = !overCap;
  const nameOk = name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(email.trim());
  const phoneOk = phone.trim().length >= 5;
  const contactOk = nameOk && emailOk && phoneOk;
  const ok = dateOk && guestsOk && contactOk;

  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });

  async function submitEnquiry() {
    if (submitting) return;
    if (!ok) {
      setShowVal(true);
      if (!range?.from || !range?.to || crossesBlocked || underMin) scroll("bk-cal");
      else if (overCap) scroll("bk-guests");
      else scroll("bk-contact");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const guestStr = `${adults} adults, ${children} children, ${infants} infants`;
      const noteCombined = [
        note,
        chef ? `Chef dinner: yes (${nights} nights)` : "",
        quadH > 0 ? `Quad bike: ${quadH}h` : "",
        !xferInc && transfers > 0 ? `Transfers: ${transfers} way(s)` : "",
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          villa,
          checkIn:  format(range!.from!, "yyyy-MM-dd"),
          checkOut: format(range!.to!,   "yyyy-MM-dd"),
          nights,
          guests: guestStr,
          name:  name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          note:  noteCombined,
          company: honeypot,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      const body = await res.json();
      setSubmitted({ reference: String(body?.reference || "—") });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "submit-failed");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const up = () => setCalMonths(window.innerWidth >= 768 ? 2 : 1);
    up(); window.addEventListener("resize", up); return () => window.removeEventListener("resize", up);
  }, []);
  useEffect(() => { if (xferInc) setTransfers(0); }, [nights, xferInc]);
  useEffect(() => { if (ok && showVal) setShowVal(false); }, [ok, showVal]);

  // Derived step-validity flags for the step-error highlight
  const datesMissing = !range?.from || !range?.to;
  const stepError = {
    dates: showVal && (datesMissing || underMin || crossesBlocked),
    guests: showVal && overCap,
    contact: showVal && !contactOk,
  };

  const rangeOk = Boolean(range?.from && range?.to);
  const checkIn  = range?.from ? format(range.from, "EEE, dd MMM") : t("booking.select");
  const checkOut = range?.to   ? format(range.to,   "EEE, dd MMM") : t("booking.select");

  const nightLabel = (n: number) => n === 1 ? t("booking.night", { n: 1 }) : t("booking.nights", { n });

  return (
    <>
      {/* ═══ HERO ═══ */}
      <header className={`bk-hero ${heroVis ? "bk-hero--vis" : ""}`}>
        <div className="bk-hero__bg" aria-hidden="true" />
        <div className="bk-hero__ov" aria-hidden="true" />
        <TopNav />
        <div className="bk-hero__ct">
          <span className="bk-hero__badge">{t("booking.heroBadge")}</span>
          <h1 className="bk-hero__title">{t("booking.heroTitle")}</h1>
          <div className="bk-hero__line" />
          <p className="bk-hero__sub">{t("booking.heroSub")}</p>
        </div>
      </header>

      {submitted ? (
        <main className="bk bk--success">
          <section className="bk-success">
            <span className="bk-success__eyebrow">{t("booking.successEyebrow")}</span>
            <h2 className="bk-success__title">{t("booking.successTitle")}</h2>
            <div className="bk-success__line" aria-hidden="true" />
            <p className="bk-success__body">{t("booking.successBody")}</p>
            <div className="bk-success__ref">
              <span className="bk-success__refLabel">{t("booking.successRefLabel")}</span>
              <strong className="bk-success__refValue tnum">{submitted.reference}</strong>
            </div>
            <p className="bk-success__hint">{t("booking.successHint")}</p>
          </section>
        </main>
      ) : (
      <main className="bk">
        {/* ═══ 1 · VILLA SELECTION ═══ */}
        <section className="bk__section">
          <div className="bk__section-head">
            <div>
              <h2 className="bk__section-title">{t("booking.s1Title")}</h2>
              <p className="bk__section-desc">{t("booking.s1Desc")}</p>
            </div>
          </div>

          <div className="bk-villas">
            {VILLA_KEYS.map((k) => {
              const v = VILLAS[k];
              const active = villa === k;
              return (
                <button
                  key={k}
                  className={`bk-villa ${active ? "bk-villa--active" : ""}`}
                  onClick={() => { setVilla(k); setRange(undefined); setShowVal(false); }}
                >
                  <img className="bk-villa__img" src={v.img} alt={v.name} loading="lazy" />
                  <div className="bk-villa__info">
                    <h3 className="bk-villa__name">{v.name}</h3>
                    <p className="bk-villa__tag">{t(v.taglineKey)}</p>
                    <div className="bk-villa__meta">
                      <span>{t("booking.priceEnquiry")}</span>
                      <span>{t("booking.sleeps", { n: v.sleeps })}</span>
                    </div>
                  </div>
                  {active && <span className="bk-villa__check">&#10003;</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ═══ 2 · DATES ═══ */}
        <section className={`bk__section ${stepError.dates ? "bk__section--error" : ""}`}>
          <div className="bk__section-head">
            <div>
              <h2 className="bk__section-title">{t("booking.s2Title")}</h2>
              <p className="bk__section-desc">{t("booking.s2Desc", { min: MIN_NIGHTS })}</p>
            </div>
            {rangeOk && (
              <button className="bk__reset" onClick={() => { setRange(undefined); setShowVal(false); }}>
                {t("booking.reset")}
              </button>
            )}
          </div>

          {/* Date summary pills */}
          <div className="bk-dates">
            <button className="bk-date" onClick={() => scroll("bk-cal")}>
              <span className="bk-date__label">{t("booking.checkIn")}</span>
              <span className="bk-date__value">{checkIn}</span>
            </button>
            <div className="bk-dates__arrow">&#8594;</div>
            <button className="bk-date" onClick={() => scroll("bk-cal")}>
              <span className="bk-date__label">{t("booking.checkOut")}</span>
              <span className="bk-date__value">{checkOut}</span>
            </button>
            <div className="bk-date bk-date--accent">
              <span className="bk-date__label">{t("booking.duration")}</span>
              <span className="bk-date__value">{nights ? nightLabel(nights) : t("booking.minNights", { min: MIN_NIGHTS })}</span>
            </div>
          </div>

          {showVal && !ok && (!range?.from || !range?.to) && (
            <div className="bk-warn" role="alert">{t("booking.warnDates")}</div>
          )}
          {showVal && !ok && rangeOk && underMin && (
            <div className="bk-warn" role="alert">{t("booking.warnMin", { min: MIN_NIGHTS })}</div>
          )}
          {rangeOk && crossesBlocked && (
            <div className="bk-warn" role="alert">{t("booking.warnBlocked")}</div>
          )}

          <div className="bk-cal" id="bk-cal">
            <DayPicker
              mode="range"
              numberOfMonths={calMonths}
              selected={range}
              onSelect={(sr) => {
                if (sr?.from && sr?.to && isBefore(sr.to, sr.from)) setRange({ from: sr.to, to: sr.from });
                else setRange(sr);
              }}
              fromDate={today}
              disabled={disabled}
              showOutsideDays={false}
              fixedWeeks={false}
              captionLayout="dropdown"
              pagedNavigation
            />
          </div>

          <div className="bk-cal__foot">
            <span className="bk-dot bk-dot--brand" /> {t("booking.dotSelected")}
            <span className="bk-dot bk-dot--muted" /> {t("booking.dotUnavail")}
            <span className="bk-dot bk-dot--open" /> {t("booking.dotAvail")}
          </div>
        </section>

        {/* ═══ 3 · GUESTS ═══ */}
        <section className={`bk__section ${stepError.guests ? "bk__section--error" : ""}`} id="bk-guests">
          <div className="bk__section-head">
            <div>
              <h2 className="bk__section-title">{t("booking.s3Title")}</h2>
              <p className="bk__section-desc">{t("booking.s3Desc", { villa: vi.name, max: vi.sleeps, fee: euro0(EXTRA_GUEST_FEE_EUR) })}</p>
            </div>
          </div>

          <div className="bk-guests">
            <GuestStepper
              id="bk-adults"
              label={t("booking.adults")}
              value={adults}
              min={1} max={12}
              onChange={setAdults}
              decLabel={t("booking.stepperDec", { label: t("booking.adults") })}
              incLabel={t("booking.stepperInc", { label: t("booking.adults") })}
            />
            <GuestStepper
              id="bk-children"
              label={t("booking.children")}
              sub={t("booking.childAge")}
              value={children}
              min={0} max={12}
              onChange={setChildren}
              decLabel={t("booking.stepperDec", { label: t("booking.children") })}
              incLabel={t("booking.stepperInc", { label: t("booking.children") })}
            />
            <GuestStepper
              id="bk-infants"
              label={t("booking.infants")}
              sub={t("booking.infantAge")}
              value={infants}
              min={0} max={6}
              onChange={setInfants}
              decLabel={t("booking.stepperDec", { label: t("booking.infants") })}
              incLabel={t("booking.stepperInc", { label: t("booking.infants") })}
            />
          </div>

          {showVal && overCap && (
            <div className="bk-warn" role="alert">{t("booking.warnCap", { villa: vi.name, max: vi.sleeps })}</div>
          )}
        </section>

        {/* ═══ 4 · ENHANCEMENTS (collapsed by default) ═══ */}
        <section className="bk__section">
          <details className="bk-extras">
            <summary className="bk-extras__summary">
              <span className="bk-extras__title">{t("booking.s4Title")}</span>
              <span className="bk-extras__hint">{t("booking.s4Optional")}</span>
            </summary>

            <p className="bk__section-desc bk-extras__desc">{t("booking.s4Desc")}</p>

            <div className="bk-enhancements">
              <label className={`bk-enh ${chef ? "bk-enh--on" : ""}`}>
                <div className="bk-enh__top">
                  <div>
                    <strong>{t("booking.chef")}</strong>
                    <span>{t("booking.chefDesc")}</span>
                  </div>
                  <span className="bk-enh__price">{euro0(CHEF_DINNER_PER_NIGHT)}/{t("booking.perNight").replace("/ ", "")}</span>
                </div>
                <div className="bk-enh__toggle">
                  <input type="checkbox" checked={chef} onChange={(e) => setChef(e.target.checked)} />
                  <span className="bk-enh__switch" />
                </div>
              </label>

              <div className="bk-enh bk-enh--select">
                <div className="bk-enh__top">
                  <div>
                    <strong>{t("booking.quad")}</strong>
                    <span>{t("booking.quadDesc")}</span>
                  </div>
                  <span className="bk-enh__price">{euro0(QUAD_PER_HOUR)}/{t("booking.hour", { n: "" }).trim()}</span>
                </div>
                <select value={quadH} onChange={(e) => setQuadH(+e.target.value)}>
                  {opt(0, 12).map((n) => <option key={n} value={n}>{n === 0 ? t("booking.notNeeded") : n === 1 ? t("booking.hour", { n }) : t("booking.hours", { n })}</option>)}
                </select>
              </div>

              <div className={`bk-enh bk-enh--select ${xferInc ? "bk-enh--inc" : ""}`}>
                <div className="bk-enh__top">
                  <div>
                    <strong>{t("booking.transfer")}</strong>
                    <span>{xferInc ? t("booking.transferInc") : t("booking.transferDesc")}</span>
                  </div>
                  <span className="bk-enh__price">{xferInc ? t("booking.included") : `${euro0(TRANSFER_PER_WAY)}/${t("booking.way", { n: "" }).trim()}`}</span>
                </div>
                {!xferInc && (
                  <select value={transfers} onChange={(e) => setTransfers(+e.target.value)}>
                    {[0, 1, 2].map((n) => <option key={n} value={n}>{n === 0 ? t("booking.notNeeded") : n === 1 ? t("booking.way", { n }) : t("booking.ways", { n })}</option>)}
                  </select>
                )}
              </div>
            </div>
          </details>

          {/* Included — single chip strip */}
          <div className="bk-included">
            <span className="bk-included__title">{t("booking.s4IncTitle")}</span>
            <div className="bk-included__chips">
              {(["Farm", "Fire", "Sauna", "Trail", "Chess", "Kids"] as const).map((k) => (
                <span className="bk-chip-sm" key={k}>{t(`booking.inc${k}`)}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 5 · SPECIAL REQUESTS ═══ */}
        <section className="bk__section">
          <div className="bk__section-head">
            <div>
              <h2 className="bk__section-title">{t("booking.s5Title")}</h2>
              <p className="bk__section-desc">{t("booking.s5Desc")}</p>
            </div>
          </div>
          <textarea
            id="bk-note"
            className="bk-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 2000))}
            placeholder={t("booking.placeholder")}
            rows={4}
            maxLength={2000}
            aria-describedby="bk-note-count"
          />
          <div
            id="bk-note-count"
            className={`bk-textarea__count tnum ${note.length > 1800 ? "bk-textarea__count--warn" : ""}`}
          >
            {note.length} / 2000
          </div>
        </section>

        {/* ═══ 6 · YOUR DETAILS ═══ */}
        <section className={`bk__section ${stepError.contact ? "bk__section--error" : ""}`} id="bk-contact">
          <div className="bk__section-head">
            <div>
              <h2 className="bk__section-title">{t("booking.s6Title")}</h2>
              <p className="bk__section-desc">{t("booking.s6Desc")}</p>
            </div>
          </div>

          <div className="bk-contact">
            <label className="bk-field">
              <span className="bk-field__label">{t("booking.nameLabel")}</span>
              <input
                type="text"
                className="bk-field__input"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 120))}
                placeholder={t("booking.namePh")}
                autoComplete="name"
                aria-invalid={showVal && !nameOk}
              />
            </label>
            <label className="bk-field">
              <span className="bk-field__label">{t("booking.emailLabel")}</span>
              <input
                type="email"
                className="bk-field__input"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 200))}
                placeholder={t("booking.emailPh")}
                autoComplete="email"
                inputMode="email"
                aria-invalid={showVal && !emailOk}
              />
            </label>
            <label className="bk-field">
              <span className="bk-field__label">{t("booking.phoneLabel")}</span>
              <input
                type="tel"
                className="bk-field__input"
                value={phone}
                onChange={(e) => setPhone(e.target.value.slice(0, 60))}
                placeholder={t("booking.phonePh")}
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={showVal && !phoneOk}
              />
            </label>
          </div>

          {/* honeypot — hidden from users, bots fill it */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
            aria-hidden="true"
          />

          {showVal && !contactOk && (
            <div className="bk-warn" role="alert">{t("booking.warnContact")}</div>
          )}
        </section>

        {/* ═══ SUBMIT ═══ */}
        <section className="bk-submit" id="bk-summary">
          {showVal && !ok && (
            <div className="bk-warn" role="status">
              {!range?.from || !range?.to
                ? t("booking.warnDates")
                : crossesBlocked
                  ? t("booking.warnBlocked")
                  : underMin
                    ? t("booking.warnMin", { min: MIN_NIGHTS })
                    : !contactOk
                      ? t("booking.warnContact")
                      : t("booking.warnCap", { villa: vi.name, max: vi.sleeps })}
            </div>
          )}

          {submitError && (
            <div className="bk-warn" role="alert">{t("booking.submitError")}</div>
          )}

          <button
            type="button"
            className="bk-cta bk-cta--primary bk-cta--wide"
            onClick={submitEnquiry}
            disabled={submitting}
          >
            {submitting ? t("booking.ctaSubmitting") : t("booking.ctaSubmit")}
          </button>
        </section>
      </main>
      )}
    </>
  );
}
