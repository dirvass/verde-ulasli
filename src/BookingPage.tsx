import TopNav from "./components/TopNav";
import React, { useEffect, useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import { differenceInCalendarDays, format, isBefore, startOfToday } from "date-fns";
import "react-day-picker/dist/style.css";
import { useLanguage } from "./i18n/LanguageContext";
import { usePageMeta } from "./hooks/usePageMeta";
import { getBooked, toDateRanges } from "./availability";
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

const CONTACT = {
  whatsappNumber: "905370123285",
  whatsappDisplay: "+90 537 012 32 85",
  email: "reservations@verde-ulasli.com",
} as const;

/* ── helpers ── */
function nightsOf(r: DateRange | undefined) {
  if (!r?.from || !r.to) return 0;
  return Math.max(0, differenceInCalendarDays(r.to, r.from));
}
const euro = (v: number) => `\u20AC\u00A0${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const euro0 = (v: number) => `\u20AC\u00A0${v.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
const opt = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

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

  useEffect(() => { const tm = setTimeout(() => setHeroVis(true), 100); return () => clearTimeout(tm); }, []);

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
  const bookedData = getBooked();
  const disabled = [{ before: today }, ...toDateRanges(bookedData[villa])];
  const ok = nights >= MIN_NIGHTS && !overCap;

  const waText = encodeURIComponent([
    t("booking.waMsg"),
    `Villa: ${vi.name}`,
    range?.from ? `Check-in: ${format(range.from, "dd MMM yyyy")}` : "Check-in: –",
    range?.to   ? `Check-out: ${format(range.to,  "dd MMM yyyy")}` : "Check-out: –",
    `Nights: ${nights}`, `Guests: ${adults} adults, ${children} children, ${infants} infants`,
    `Extras: Chef=${chef?"Yes":"No"}, Quad=${quadH}h, Transfers=${xferInc?"Included":`${transfers} way(s)`}`,
    `Estimate: ${euro(total)} (excl. deposit \u20AC${DEPOSIT})`,
    note ? `Note: ${note}` : "",
  ].filter(Boolean).join("\n"));
  const waUrl = `https://wa.me/${CONTACT.whatsappNumber}?text=${waText}`;
  const mailSubject = encodeURIComponent(`Booking – ${vi.name}`);
  const mailUrl = `mailto:${CONTACT.email}?subject=${mailSubject}&body=${waText}`;

  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  const send = (type: "wa" | "mail") => {
    if (!ok) { setShowVal(true); scroll("bk-cal"); return; }
    if (type === "wa") window.open(waUrl, "_blank", "noopener,noreferrer");
    else window.location.href = mailUrl;
  };

  useEffect(() => {
    const up = () => setCalMonths(window.innerWidth >= 1440 ? 3 : window.innerWidth >= 1024 ? 2 : 1);
    up(); window.addEventListener("resize", up); return () => window.removeEventListener("resize", up);
  }, []);
  useEffect(() => { if (xferInc) setTransfers(0); }, [nights]);
  useEffect(() => { if (ok && showVal) setShowVal(false); }, [ok, showVal]);

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

      <main className="bk">
        {/* ═══ 1 · VILLA SELECTION ═══ */}
        <section className="bk__section">
          <div className="bk__section-head">
            <span className="bk__step">01</span>
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
        <section className="bk__section">
          <div className="bk__section-head">
            <span className="bk__step">02</span>
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
        <section className="bk__section">
          <div className="bk__section-head">
            <span className="bk__step">03</span>
            <div>
              <h2 className="bk__section-title">{t("booking.s3Title")}</h2>
              <p className="bk__section-desc">{t("booking.s3Desc", { villa: vi.name, max: vi.sleeps, fee: euro0(EXTRA_GUEST_FEE_EUR) })}</p>
            </div>
          </div>

          <div className="bk-guests">
            <label className="bk-counter">
              <span className="bk-counter__label">{t("booking.adults")}</span>
              <select value={adults} onChange={(e) => setAdults(+e.target.value)}>
                {opt(1, 12).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="bk-counter">
              <span className="bk-counter__label">{t("booking.children")} <small>{t("booking.childAge")}</small></span>
              <select value={children} onChange={(e) => setChildren(+e.target.value)}>
                {opt(0, 12).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="bk-counter">
              <span className="bk-counter__label">{t("booking.infants")} <small>{t("booking.infantAge")}</small></span>
              <select value={infants} onChange={(e) => setInfants(+e.target.value)}>
                {opt(0, 6).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          {showVal && overCap && (
            <div className="bk-warn" role="alert">{t("booking.warnCap", { villa: vi.name, max: vi.sleeps })}</div>
          )}
        </section>

        {/* ═══ 4 · ENHANCEMENTS ═══ */}
        <section className="bk__section">
          <div className="bk__section-head">
            <span className="bk__step">04</span>
            <div>
              <h2 className="bk__section-title">{t("booking.s4Title")}</h2>
              <p className="bk__section-desc">{t("booking.s4Desc")}</p>
            </div>
          </div>

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

          {/* ── Included experiences ── */}
          <div className="bk-included">
            <h3 className="bk-included__title">{t("booking.s4IncTitle")}</h3>
            <p className="bk-included__desc">{t("booking.s4IncDesc")}</p>
            <div className="bk-included__grid">
              {(["Farm", "Fire", "Sauna", "Trail", "Chess", "Kids"] as const).map((k) => (
                <div className="bk-included__item" key={k}>
                  <strong>{t(`booking.inc${k}`)}</strong>
                  <span>{t(`booking.inc${k}D`)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 5 · SPECIAL REQUESTS ═══ */}
        <section className="bk__section">
          <div className="bk__section-head">
            <span className="bk__step">05</span>
            <div>
              <h2 className="bk__section-title">{t("booking.s5Title")}</h2>
              <p className="bk__section-desc">{t("booking.s5Desc")}</p>
            </div>
          </div>
          <textarea
            className="bk-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 2000))}
            placeholder={t("booking.placeholder")}
            rows={4}
            maxLength={2000}
          />
        </section>

        {/* ═══ SUMMARY & CTA ═══ */}
        <section className="bk-summary" id="bk-summary">
          <div className="bk-summary__inner">
            {SHOW_PRICING ? (
              /* ── Pricing visible: estimate + breakdown + perks ── */
              <>
                <div className="bk-summary__left">
                  <span className="bk-summary__eyebrow">{t("booking.estimate")}</span>
                  <h2 className="bk-summary__total">{euro(total)}</h2>
                  <p className="bk-summary__sub">
                    {nights
                      ? t("booking.nightsIn", { n: nights, villa: vi.name })
                      : t("booking.addDates")}
                    {nights > 0 && ` — ${t("booking.exclDeposit", { deposit: euro0(DEPOSIT) })}`}
                  </p>
                </div>

                <div className="bk-summary__breakdown">
                  <div className="bk-summary__row">
                    <span>{t("booking.rowAccom")}</span>
                    <span>{nights ? `${nights} \u00D7 ${euro0(vi.nightlyEUR)}` : "\u2014"}</span>
                    <strong>{nights ? euro(base) : "\u2014"}</strong>
                  </div>
                  {extraFee > 0 && (
                    <div className="bk-summary__row">
                      <span>{t("booking.rowExtra")}</span>
                      <span>{nights} \u00D7 {euro0(EXTRA_GUEST_FEE_EUR)} \u00D7 {extraG}</span>
                      <strong>{euro(extraFee)}</strong>
                    </div>
                  )}
                  {chefTot > 0 && (
                    <div className="bk-summary__row">
                      <span>{t("booking.rowChef")}</span>
                      <span>{nights} \u00D7 {euro0(CHEF_DINNER_PER_NIGHT)}</span>
                      <strong>{euro(chefTot)}</strong>
                    </div>
                  )}
                  {quadTot > 0 && (
                    <div className="bk-summary__row">
                      <span>{t("booking.rowQuad")}</span>
                      <span>{quadH}h \u00D7 {euro0(QUAD_PER_HOUR)}</span>
                      <strong>{euro(quadTot)}</strong>
                    </div>
                  )}
                  {xferTot > 0 && (
                    <div className="bk-summary__row">
                      <span>{t("booking.rowTransfer")}</span>
                      <span>{transfers} \u00D7 {euro0(TRANSFER_PER_WAY)}</span>
                      <strong>{euro(xferTot)}</strong>
                    </div>
                  )}
                  {clean > 0 && (
                    <div className="bk-summary__row bk-summary__row--light">
                      <span>{t("booking.rowClean")}</span><span></span><strong>{euro(clean)}</strong>
                    </div>
                  )}
                  {svc > 0 && (
                    <div className="bk-summary__row bk-summary__row--light">
                      <span>{t("booking.rowService", { pct: Math.round(SERVICE_FEE_PCT * 100) })}</span><span></span><strong>{euro(svc)}</strong>
                    </div>
                  )}
                </div>

                {nights > 0 && (
                  <div className="bk-summary__perks">
                    <span>{t("booking.perkBreakfast")}</span>
                    <span>{t("booking.perkBikes")}</span>
                    <span>{t("booking.perkPingPong")}</span>
                    {xferInc && <span>{t("booking.perkTransfers")}</span>}
                    {xferInc && <span>{t("booking.perkFloating")}</span>}
                  </div>
                )}
              </>
            ) : (
              /* ── Pricing hidden: enquiry message ── */
              <div className="bk-summary__left">
                <span className="bk-summary__eyebrow">{t("booking.summaryLabel")}</span>
                <h2 className="bk-summary__total" style={{ fontSize: "clamp(1.4rem,3vw,2rem)" }}>{t("booking.summaryTitle")}</h2>
                <p className="bk-summary__sub">
                  {nights
                    ? t("booking.nightsIn", { n: nights, villa: vi.name })
                    : t("booking.summaryDesc")}
                </p>
              </div>
            )}

            {showVal && !ok && (
              <div className="bk-warn" role="status" style={{ marginTop: 12 }}>
                {!range?.from || !range?.to ? t("booking.warnDates") : underMin ? t("booking.warnMin", { min: MIN_NIGHTS }) : t("booking.warnCap", { villa: vi.name, max: vi.sleeps })}
              </div>
            )}

            <div className="bk-summary__actions">
              <button className="bk-cta bk-cta--primary" onClick={() => send("wa")}>
                {t("booking.ctaWA")}
              </button>
              <button className="bk-cta bk-cta--ghost" onClick={() => send("mail")}>
                {t("booking.ctaEmail")}
              </button>
            </div>

            <p className="bk-summary__contact">
              {t("booking.contact", { phone: CONTACT.whatsappDisplay })}
            </p>
          </div>
        </section>
      </main>

      {/* ═══ MOBILE STICKY BAR ═══ */}
      <div className="bk-mobile-bar">
        <div>
          <strong className="bk-mobile-bar__total">{SHOW_PRICING ? euro(total) : t("booking.summaryTitle")}</strong>
          <span className="bk-mobile-bar__sub">{nights ? nightLabel(nights) : t("booking.mobileAdd")}</span>
        </div>
        <button className="bk-cta bk-cta--primary bk-cta--sm" onClick={() => send("wa")}>{t("booking.mobileRes")}</button>
      </div>
    </>
  );
}
