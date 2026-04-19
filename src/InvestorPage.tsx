import React, { useEffect, useMemo, useState } from "react";
import TopNav from "./components/TopNav";
import { useLanguage } from "./i18n/LanguageContext";
import { usePageMeta } from "./hooks/usePageMeta";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import capexData from "./data/capex.json";
import "./styles/InvestorPage.css";
import "./styles/PlannerPage.css";

type Villa = { id: string; name: string; dailyFee: number; occupancy: number; costPct: number };
type Scenario = "pessimistic" | "base" | "optimistic";
type Currency = "EUR" | "USD" | "GBP";
type Tab = "financials" | "brand" | "capex";

const SCN_LABEL_KEYS: Record<Scenario, string> = { pessimistic: "planner.pessimistic", base: "planner.base", optimistic: "planner.optimistic" };
const SCN_COLORS: Record<Scenario, string> = { pessimistic: "#C9B99A", base: "#C3A564", optimistic: "#6ECFA0" };

export default function InvestorPage() {
  usePageMeta("meta.investorTitle", "meta.investorDesc");
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("financials");
  const [heroVis, setHeroVis] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setHeroVis(true), 100); return () => clearTimeout(tm); }, []);

  return (
    <>
      {/* HERO */}
      <header className={`inv-hero ${heroVis ? "inv-hero--vis" : ""}`}>
        <div className="inv-hero__bg" aria-hidden="true" />
        <div className="inv-hero__ov" aria-hidden="true" />
        <TopNav />
        <div className="inv-hero__ct">
          <span className="inv-hero__badge">{t("investor.heroBadge")}</span>
          <h1 className="inv-hero__title">VERDE ULAŞLI</h1>
          <div className="inv-hero__line" />
          <p className="inv-hero__sub">{t("investor.heroSub")}</p>
        </div>
      </header>

      {/* TABS */}
      <nav className="inv-tabs">
        <button className={`inv-tab ${tab === "financials" ? "inv-tab--active" : ""}`} onClick={() => setTab("financials")}>
          {t("investor.tabFinancials")}
        </button>
        <button className={`inv-tab ${tab === "brand" ? "inv-tab--active" : ""}`} onClick={() => setTab("brand")}>
          {t("investor.tabBrand")}
        </button>
        <button className={`inv-tab ${tab === "capex" ? "inv-tab--active" : ""}`} onClick={() => setTab("capex")}>
          {t("investor.tabCapex")}
        </button>
      </nav>

      {/* CONTENT */}
      {tab === "financials" && <FinancialsTab />}
      {tab === "brand" && <BrandTab />}
      {tab === "capex" && <CapexTab />}
    </>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* FINANCIALS TAB                                            */
/* ══════════════════════════════════════════════════════════ */
function FinancialsTab() {
  const { t } = useLanguage();
  const [villas, setVillas] = useState<Villa[]>([
    { id: crypto.randomUUID(), name: "ALYA",  dailyFee: 750, occupancy: 0.60, costPct: 0.35 },
    { id: crypto.randomUUID(), name: "ZEHRA", dailyFee: 750, occupancy: 0.60, costPct: 0.35 },
  ]);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [activeScn, setActiveScn] = useState<Scenario>("base");

  const sym: Record<Currency, string> = { EUR: "€", USD: "$", GBP: "£" };
  const [rates, setRates] = useState<Record<Currency, number>>({ EUR: 1, USD: 1.08, GBP: 0.86 });

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    fetch("https://api.exchangerate.host/latest?base=EUR&symbols=USD,GBP", { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((d: unknown) => {
        if (!d || typeof d !== "object") return;
        const rates = (d as { rates?: unknown }).rates;
        if (!rates || typeof rates !== "object") return;
        const usd = (rates as { USD?: unknown }).USD;
        const gbp = (rates as { GBP?: unknown }).GBP;
        setRates(p => ({
          ...p,
          USD: typeof usd === "number" && Number.isFinite(usd) ? usd : p.USD,
          GBP: typeof gbp === "number" && Number.isFinite(gbp) ? gbp : p.GBP,
        }));
      })
      .catch(() => { /* network / abort / deprecated endpoint — fall back to defaults */ });
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, []);

  const fx = (n: number) => n * (rates[currency] ?? 1);
  const fmt0 = (n: number) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n);
  const fmtC = (n: number) => `${sym[currency]}\u00A0${fmt0(fx(n))}`;

  const rows = useMemo(() => villas.map(v => {
    const ebitda = v.dailyFee * 365 * v.occupancy;
    const net = ebitda * (1 - v.costPct);
    return { ...v, ebitda, net };
  }), [villas]);

  const totals = useMemo(() => ({
    ebitda: rows.reduce((a, r) => a + r.ebitda, 0),
    net: rows.reduce((a, r) => a + r.net, 0),
  }), [rows]);

  function update(id: string, p: Partial<Villa>) { setVillas(prev => prev.map(v => v.id === id ? { ...v, ...p } : v)); }
  function addVilla() { setVillas(p => [...p, { id: crypto.randomUUID(), name: `Villa ${p.length + 1}`, dailyFee: 600, occupancy: 0.6, costPct: 0.35 }]); }
  function removeVilla(id: string) { setVillas(p => p.filter(v => v.id !== id)); }

  function applyScenario(s: Scenario) {
    setActiveScn(s);
    const fees: Record<Scenario, [number, number]> = { pessimistic: [500, 500], base: [750, 750], optimistic: [1000, 1000] };
    const cost: Record<Scenario, number> = { pessimistic: 0.38, base: 0.35, optimistic: 0.32 };
    setVillas(prev => prev.map((v, i) => ({
      ...v, name: i === 0 ? "ALYA" : i === 1 ? "ZEHRA" : v.name,
      dailyFee: fees[s][i] ?? v.dailyFee, occupancy: 0.60, costPct: cost[s],
    })));
  }

  const eff = (y: number) => Math.max(0, y - 2);

  function scnNet(s: Scenario) {
    const feeMap = { pessimistic: [500, 500], base: [750, 750], optimistic: [1000, 1000] } as const;
    const costMap = { pessimistic: 0.38, base: 0.35, optimistic: 0.32 } as const;
    let tot = 0;
    villas.forEach((_, i) => { const d = feeMap[s][i] ?? feeMap[s][0]; tot += d * 365 * 0.6 * (1 - costMap[s]); });
    return tot;
  }

  const chartData = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => {
      const y = i + 1;
      return {
        year: y,
        pessimistic: fx(scnNet("pessimistic") * eff(y)),
        base: fx(scnNet("base") * eff(y)),
        optimistic: fx(scnNet("optimistic") * eff(y)),
      };
    }), [villas, currency, rates]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="pl-tooltip">
        <div className="pl-tooltip__label">{t("planner.year", { n: label })}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="pl-tooltip__row">
            <span className="pl-tooltip__dot" style={{ background: p.color }} />
            <span>{t(SCN_LABEL_KEYS[p.dataKey as Scenario])}</span>
            <strong>{sym[currency]}&nbsp;{fmt0(p.value)}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="pl">
      {/* KPI CARDS */}
      <section className="pl-kpis">
        <div className="pl-kpi">
          <span className="pl-kpi__label">{t("planner.kpiEbitda")}</span>
          <span className="pl-kpi__value">{fmtC(totals.ebitda)}</span>
        </div>
        <div className="pl-kpi">
          <span className="pl-kpi__label">{t("planner.kpiNet")}</span>
          <span className="pl-kpi__value">{fmtC(totals.net)}</span>
        </div>
        <div className="pl-kpi">
          <span className="pl-kpi__label">{t("planner.kpi5y")}</span>
          <span className="pl-kpi__value">{fmtC(totals.net * eff(5))}</span>
        </div>
        <div className="pl-kpi pl-kpi--accent">
          <span className="pl-kpi__label">{t("planner.kpi15y")}</span>
          <span className="pl-kpi__value">{fmtC(totals.net * eff(15))}</span>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="pl-controls">
        <div className="pl-controls__left">
          <div className="pl-scenarios">
            {(["pessimistic", "base", "optimistic"] as Scenario[]).map(s => (
              <button
                key={s}
                className={`pl-scn ${activeScn === s ? "pl-scn--active" : ""}`}
                style={{ "--scn-color": SCN_COLORS[s] } as React.CSSProperties}
                onClick={() => applyScenario(s)}
              >
                <span className="pl-scn__dot" />
                {t(SCN_LABEL_KEYS[s])}
              </button>
            ))}
          </div>
          <select className="pl-currency" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
            <option value="EUR">€ EUR</option>
            <option value="USD">$ USD</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
        <button className="pl-add" onClick={addVilla}>{t("planner.addVilla")}</button>
      </section>

      {/* CHART */}
      <section className="pl-chart-wrap">
        <h2 className="pl-section-title">{t("planner.chartTitle")}</h2>
        <p className="pl-section-desc">{t("planner.chartDesc")}</p>
        <div className="pl-chart">
          <ResponsiveContainer width="100%" height={420}>
            <AreaChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 8 }}>
              <defs>
                <linearGradient id="gPess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SCN_COLORS.pessimistic} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={SCN_COLORS.pessimistic} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SCN_COLORS.base} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SCN_COLORS.base} stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gOpt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SCN_COLORS.optimistic} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={SCN_COLORS.optimistic} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(195,165,100,.08)" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="year" tickFormatter={y => `${y}Y`} tick={{ fill: "rgba(235,232,225,.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${sym[currency]} ${fmt0(v)}`} tick={{ fill: "rgba(235,232,225,.35)", fontSize: 11 }} width={95} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="pessimistic" stroke={SCN_COLORS.pessimistic} strokeWidth={2} fill="url(#gPess)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#0E1A16" }} />
              <Area type="monotone" dataKey="base" stroke={SCN_COLORS.base} strokeWidth={2.5} fill="url(#gBase)" dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: "#0E1A16" }} />
              <Area type="monotone" dataKey="optimistic" stroke={SCN_COLORS.optimistic} strokeWidth={2} fill="url(#gOpt)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#0E1A16" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="pl-chart__legend">
          {(["pessimistic", "base", "optimistic"] as Scenario[]).map(s => (
            <span key={s}><span className="pl-chart__ldot" style={{ background: SCN_COLORS[s] }} />{t(SCN_LABEL_KEYS[s])}</span>
          ))}
        </div>
      </section>

      {/* VILLA TABLE */}
      <section className="pl-table-wrap">
        <h2 className="pl-section-title">{t("planner.tableTitle")}</h2>
        <div className="pl-table-scroll">
          <table className="pl-table">
            <thead>
              <tr>
                <th>{t("planner.thVilla")}</th>
                <th>{t("planner.thRate")}</th>
                <th>{t("planner.thOcc")}</th>
                <th>{t("planner.thCost")}</th>
                <th>{t("planner.thEbitda")}</th>
                <th>{t("planner.thNet")}</th>
                <th>{t("planner.th5y")}</th>
                <th>{t("planner.th10y")}</th>
                <th>{t("planner.th15y")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td><input className="pl-input pl-input--name" value={r.name} onChange={e => update(r.id, { name: e.target.value })} /></td>
                  <td>
                    <div className="pl-input-group">
                      <span>€</span>
                      <input className="pl-input" type="number" value={r.dailyFee} onChange={e => update(r.id, { dailyFee: Number(e.target.value || 0) })} />
                    </div>
                  </td>
                  <td>
                    <div className="pl-input-group">
                      <input className="pl-input pl-input--sm" type="number" min={0} max={100} value={Math.round(r.occupancy * 100)} onChange={e => update(r.id, { occupancy: Math.min(100, Math.max(0, +e.target.value)) / 100 })} />
                      <span>%</span>
                    </div>
                  </td>
                  <td>
                    <div className="pl-input-group">
                      <input className="pl-input pl-input--sm" type="number" min={0} max={100} value={Math.round(r.costPct * 100)} onChange={e => update(r.id, { costPct: Math.min(100, Math.max(0, +e.target.value)) / 100 })} />
                      <span>%</span>
                    </div>
                  </td>
                  <td className="pl-td--num">{fmtC(r.ebitda)}</td>
                  <td className="pl-td--num">{fmtC(r.net)}</td>
                  <td className="pl-td--num">{fmtC(r.net * eff(5))}</td>
                  <td className="pl-td--num">{fmtC(r.net * eff(10))}</td>
                  <td className="pl-td--num">{fmtC(r.net * eff(15))}</td>
                  <td><button className="pl-del" onClick={() => removeVilla(r.id)}>&#10005;</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>{t("planner.total")}</strong></td><td></td><td></td><td></td>
                <td className="pl-td--num"><strong>{fmtC(totals.ebitda)}</strong></td>
                <td className="pl-td--num"><strong>{fmtC(totals.net)}</strong></td>
                <td className="pl-td--num"><strong>{fmtC(totals.net * eff(5))}</strong></td>
                <td className="pl-td--num"><strong>{fmtC(totals.net * eff(10))}</strong></td>
                <td className="pl-td--num"><strong>{fmtC(totals.net * eff(15))}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* DETAILED SCENARIO BREAKDOWN */}
      <section className="pl-detail">
        <h2 className="pl-section-title">{t("planner.scnTitle")}</h2>
        <p className="pl-section-desc">{t("planner.scnDesc")}</p>

        <div className="pl-detail__grid">
          {/* LAUNCH */}
          <div className="pl-detail__card">
            <h3 className="pl-detail__h" style={{borderColor: SCN_COLORS.pessimistic}}>{t("planner.scnLaunch")}</h3>
            <table className="pl-detail__table">
              <tbody>
                <tr><td>{t("planner.accommodation")}</td><td className="pl-td--num">&euro; 219,000</td></tr>
                <tr><td>{t("planner.cleaningExtras")}</td><td className="pl-td--num">&euro; 32,450</td></tr>
                <tr><td><strong>{t("planner.grossRevenue")}</strong></td><td className="pl-td--num"><strong>&euro; 251,450</strong></td></tr>
                <tr><td colSpan={2} style={{height:8}}></td></tr>
                <tr><td>{t("planner.personnel1")}</td><td className="pl-td--num">&euro; 30,000</td></tr>
                <tr><td>{t("planner.utilities")}</td><td className="pl-td--num">&euro; 29,000</td></tr>
                <tr><td>{t("planner.marketingPlatform")}</td><td className="pl-td--num">&euro; 24,710</td></tr>
                <tr><td>{t("planner.cleaningAccounting")}</td><td className="pl-td--num">&euro; 12,000</td></tr>
                <tr><td><strong>{t("planner.totalOpex")}</strong></td><td className="pl-td--num"><strong>&euro; 95,710</strong></td></tr>
                <tr><td colSpan={2} style={{height:8}}></td></tr>
                <tr><td><strong>EBITDA</strong></td><td className="pl-td--num"><strong>&euro; 155,740</strong></td></tr>
                <tr><td>{t("planner.depreciationTax")}</td><td className="pl-td--num">&euro; (61,060)</td></tr>
                <tr style={{background:'rgba(45,80,64,0.06)'}}><td><strong>{t("planner.netProfitAnnual")}</strong></td><td className="pl-td--num"><strong>&euro; 94,680</strong></td></tr>
              </tbody>
            </table>
          </div>

          {/* GROWTH */}
          <div className="pl-detail__card">
            <h3 className="pl-detail__h" style={{borderColor: SCN_COLORS.base}}>{t("planner.scnGrowth")}</h3>
            <table className="pl-detail__table">
              <tbody>
                <tr><td>{t("planner.accommodation")}</td><td className="pl-td--num">&euro; 328,500</td></tr>
                <tr><td>{t("planner.cleaningService")}</td><td className="pl-td--num">&euro; 32,925</td></tr>
                <tr><td>{t("planner.chefExperiences")}</td><td className="pl-td--num">&euro; 49,310</td></tr>
                <tr><td><strong>{t("planner.grossRevenue")}</strong></td><td className="pl-td--num"><strong>&euro; 410,735</strong></td></tr>
                <tr><td colSpan={2} style={{height:8}}></td></tr>
                <tr><td>{t("planner.personnel2")}</td><td className="pl-td--num">&euro; 45,000</td></tr>
                <tr><td>{t("planner.utilities")}</td><td className="pl-td--num">&euro; 34,600</td></tr>
                <tr><td>{t("planner.marketingPlatform")}</td><td className="pl-td--num">&euro; 34,638</td></tr>
                <tr><td>{t("planner.operationsFarm")}</td><td className="pl-td--num">&euro; 40,390</td></tr>
                <tr><td><strong>{t("planner.totalOpex")}</strong></td><td className="pl-td--num"><strong>&euro; 154,628</strong></td></tr>
                <tr><td colSpan={2} style={{height:8}}></td></tr>
                <tr><td><strong>EBITDA</strong></td><td className="pl-td--num"><strong>&euro; 256,107</strong></td></tr>
                <tr><td>{t("planner.depreciationTax")}</td><td className="pl-td--num">&euro; (86,152)</td></tr>
                <tr style={{background:'rgba(45,80,64,0.06)'}}><td><strong>{t("planner.netProfitAnnual")}</strong></td><td className="pl-td--num"><strong>&euro; 169,955</strong></td></tr>
              </tbody>
            </table>
          </div>

          {/* PREMIUM */}
          <div className="pl-detail__card">
            <h3 className="pl-detail__h" style={{borderColor: SCN_COLORS.optimistic}}>{t("planner.scnPremium")}</h3>
            <table className="pl-detail__table">
              <tbody>
                <tr><td>{t("planner.accommodation")}</td><td className="pl-td--num">&euro; 438,000</td></tr>
                <tr><td>{t("planner.cleaningService")}</td><td className="pl-td--num">&euro; 38,400</td></tr>
                <tr><td>{t("planner.chefExperiences")}</td><td className="pl-td--num">&euro; 86,790</td></tr>
                <tr><td>{t("planner.localProducts")}</td><td className="pl-td--num">&euro; 3,000</td></tr>
                <tr><td><strong>{t("planner.grossRevenue")}</strong></td><td className="pl-td--num"><strong>&euro; 566,190</strong></td></tr>
                <tr><td colSpan={2} style={{height:8}}></td></tr>
                <tr><td>{t("planner.personnel4")}</td><td className="pl-td--num">&euro; 84,240</td></tr>
                <tr><td>{t("planner.utilities")}</td><td className="pl-td--num">&euro; 45,000</td></tr>
                <tr><td>{t("planner.marketingInfluencer")}</td><td className="pl-td--num">&euro; 51,280</td></tr>
                <tr><td>{t("planner.operationsPremium")}</td><td className="pl-td--num">&euro; 64,229</td></tr>
                <tr><td><strong>{t("planner.totalOpex")}</strong></td><td className="pl-td--num"><strong>&euro; 244,749</strong></td></tr>
                <tr><td colSpan={2} style={{height:8}}></td></tr>
                <tr><td><strong>EBITDA</strong></td><td className="pl-td--num"><strong>&euro; 321,441</strong></td></tr>
                <tr><td>{t("planner.depreciationTax")}</td><td className="pl-td--num">&euro; (102,485)</td></tr>
                <tr style={{background:'rgba(45,80,64,0.06)'}}><td><strong>{t("planner.netProfitAnnual")}</strong></td><td className="pl-td--num"><strong>&euro; 218,956</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* COMPARISON & ROI */}
      <section className="pl-table-wrap">
        <h2 className="pl-section-title">{t("planner.roiTitle")}</h2>
        <p className="pl-section-desc">{t("planner.roiDesc")}</p>
        <div className="pl-table-scroll">
          <table className="pl-table">
            <thead>
              <tr>
                <th></th>
                <th>{t("planner.roiLaunch")}</th>
                <th>{t("planner.roiGrowth")}</th>
                <th>{t("planner.roiPremium")}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>{t("planner.perVillaNight")}</td><td className="pl-td--num">&euro;500</td><td className="pl-td--num">&euro;750</td><td className="pl-td--num">&euro;1,000</td></tr>
              <tr><td>{t("planner.combinedNight")}</td><td className="pl-td--num">&euro;1,000</td><td className="pl-td--num">&euro;1,500</td><td className="pl-td--num">&euro;2,000</td></tr>
              <tr><td>{t("planner.personnel")}</td><td className="pl-td--num">1-2</td><td className="pl-td--num">2</td><td className="pl-td--num">4</td></tr>
              <tr><td>{t("planner.grossRevenueShort")}</td><td className="pl-td--num">&euro;251K</td><td className="pl-td--num">&euro;411K</td><td className="pl-td--num">&euro;566K</td></tr>
              <tr><td>{t("planner.netProfitRow")}</td><td className="pl-td--num">&euro;95K</td><td className="pl-td--num">&euro;170K</td><td className="pl-td--num">&euro;219K</td></tr>
              <tr><td>{t("planner.netMargin")}</td><td className="pl-td--num">37.6%</td><td className="pl-td--num">41.4%</td><td className="pl-td--num">38.7%</td></tr>
              <tr style={{background:'rgba(195,165,100,0.06)'}}><td>{t("planner.year12")}</td><td className="pl-td--num">&euro;0</td><td className="pl-td--num">&euro;0</td><td className="pl-td--num">&euro;0</td></tr>
              <tr><td>{t("planner.cumulative5y")}</td><td className="pl-td--num">&euro;284K</td><td className="pl-td--num">&euro;510K</td><td className="pl-td--num">&euro;657K</td></tr>
              <tr><td>{t("planner.cumulative10y")}</td><td className="pl-td--num">&euro;757K</td><td className="pl-td--num">&euro;1.36M</td><td className="pl-td--num">&euro;1.75M</td></tr>
              <tr><td>{t("planner.cumulative15y")}</td><td className="pl-td--num">&euro;1.23M</td><td className="pl-td--num">&euro;2.21M</td><td className="pl-td--num">&euro;2.85M</td></tr>
              <tr style={{background:'rgba(45,80,64,0.08)'}}><td><strong>{t("planner.payback")}</strong></td><td className="pl-td--num"><strong>{t("planner.payback1")}</strong></td><td className="pl-td--num"><strong>{t("planner.payback2")}</strong></td><td className="pl-td--num"><strong>{t("planner.payback3")}</strong></td></tr>
              <tr><td>{t("planner.breakeven")}</td><td className="pl-td--num">17.0%</td><td className="pl-td--num">14.1%</td><td className="pl-td--num">18.8%</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* GROWTH STRATEGY */}
      <section className="pl-table-wrap">
        <h2 className="pl-section-title">{t("planner.gsTitle")}</h2>
        <p className="pl-section-desc">{t("planner.gsDesc")}</p>
        <div className="pl-table-scroll">
          <table className="pl-table">
            <thead><tr><th>{t("planner.gsPeriod")}</th><th>{t("planner.gsPricing")}</th><th>{t("planner.gsTeam")}</th><th>{t("planner.gsGoal")}</th></tr></thead>
            <tbody>
              <tr><td>{t("planner.gsP1")}</td><td>{t("planner.gsPr1")}</td><td>{t("planner.gsT1")}</td><td>{t("planner.gsG1")}</td></tr>
              <tr><td>{t("planner.gsP2")}</td><td>{t("planner.gsPr2")}</td><td>{t("planner.gsT2")}</td><td>{t("planner.gsG2")}</td></tr>
              <tr><td>{t("planner.gsP3")}</td><td>{t("planner.gsPr3")}</td><td>{t("planner.gsT3")}</td><td>{t("planner.gsG3")}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pl-foot">
        <p>{t("planner.foot1")}</p>
        <p>{t("planner.foot2")}</p>
      </footer>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* BRAND TAB                                                 */
/* ══════════════════════════════════════════════════════════ */
function BrandTab() {
  const { t } = useLanguage();

  return (
    <main className="inv-brand">
      {/* 1. PROJECT OVERVIEW */}
      <section className="inv-section">
        <h2 className="inv-section__title">{t("investor.overviewTitle")}</h2>
        <div className="inv-section__divider" />
        <p className="inv-section__body">{t("investor.overviewBody")}</p>
        <table className="inv-table">
          <tbody>
            <tr><td>{t("investor.labelLocation")}</td><td>{t("investor.valueLocation")}</td></tr>
            <tr><td>{t("investor.labelEstate")}</td><td>{t("investor.valueEstate")}</td></tr>
            <tr><td>{t("investor.labelVillas")}</td><td>{t("investor.valueVillas")}</td></tr>
            <tr><td>{t("investor.labelPrice")}</td><td>{t("investor.valuePrice")}</td></tr>
            <tr><td>{t("investor.labelCapex")}</td><td>{t("investor.valueCapex")}</td></tr>
            <tr><td>{t("investor.labelOpening")}</td><td>{t("investor.valueOpening")}</td></tr>
            <tr><td>{t("investor.labelWebsite")}</td><td><a href="https://verde-ulasli.com" target="_blank" rel="noopener noreferrer">verde-ulasli.com</a></td></tr>
            <tr><td>{t("investor.labelInstagram")}</td><td>@verde.ulasli</td></tr>
            <tr><td>{t("investor.labelEmail")}</td><td>info@verde-ulasli.com</td></tr>
          </tbody>
        </table>
      </section>

      {/* 2. BRAND IDENTITY */}
      <section className="inv-section">
        <h2 className="inv-section__title">{t("investor.brandTitle")}</h2>
        <div className="inv-section__divider" />
        <p className="inv-section__body"><strong>VERDE</strong> — {t("investor.brandBody")}</p>
        <table className="inv-table">
          <tbody>
            <tr><td>{t("investor.labelBrandName")}</td><td>VERDE ULAŞLI</td></tr>
            <tr><td>{t("investor.labelLogo")}</td><td>{t("investor.valueLogo")}</td></tr>
            <tr><td>{t("investor.labelPalette")}</td><td>#0E1A16 (deep green), #2D5040 (forest), #C9B99A (sand), #C3A564 (gold), #EBE8E1 (mist)</td></tr>
            <tr><td>{t("investor.labelTypography")}</td><td>{t("investor.valueTypography")}</td></tr>
            <tr><td>{t("investor.labelVoice")}</td><td>{t("investor.valueVoice")}</td></tr>
            <tr><td>{t("investor.labelPillars")}</td><td>{t("investor.valuePillars")}</td></tr>
            <tr><td>{t("investor.labelSeasons")}</td><td>{t("investor.valueSeasons")}</td></tr>
          </tbody>
        </table>
      </section>

      {/* 3. COMPLETED WORK */}
      <section className="inv-section">
        <h2 className="inv-section__title">{t("investor.completedTitle")}</h2>
        <div className="inv-section__divider" />

        <h3 className="inv-sub">{t("investor.subWebsite")}</h3>
        <table className="inv-table">
          <thead><tr><th>{t("investor.thPage")}</th><th>{t("investor.thContent")}</th><th>{t("investor.thStatus")}</th></tr></thead>
          <tbody>
            <tr><td>{t("investor.pagHome")}</td><td>{t("investor.pagHomeContent")}</td><td className="inv-done">{t("investor.statusLive")}</td></tr>
            <tr><td>{t("investor.pagStory")}</td><td>{t("investor.pagStoryContent")}</td><td className="inv-done">{t("investor.statusLive")}</td></tr>
            <tr><td>{t("investor.pagExperiences")}</td><td>{t("investor.pagExperiencesContent")}</td><td className="inv-done">{t("investor.statusLive")}</td></tr>
            <tr><td>{t("investor.pagGallery")}</td><td>{t("investor.pagGalleryContent")}</td><td className="inv-done">{t("investor.statusLive")}</td></tr>
            <tr><td>{t("investor.pagBooking")}</td><td>{t("investor.pagBookingContent")}</td><td className="inv-done">{t("investor.statusLive")}</td></tr>
          </tbody>
        </table>

        <h3 className="inv-sub">{t("investor.subDigital")}</h3>
        <table className="inv-table">
          <thead><tr><th>{t("investor.thAsset")}</th><th>{t("investor.thDetail")}</th><th>{t("investor.thStatus")}</th></tr></thead>
          <tbody>
            <tr><td>{t("investor.diDomain")}</td><td>{t("investor.diDomainDetail")}</td><td className="inv-done">{t("investor.statusActive")}</td></tr>
            <tr><td>{t("investor.diHosting")}</td><td>{t("investor.diHostingDetail")}</td><td className="inv-done">{t("investor.statusActive")}</td></tr>
            <tr><td>{t("investor.diEmail")}</td><td>{t("investor.diEmailDetail")}</td><td className="inv-done">{t("investor.statusActive")}</td></tr>
            <tr><td>{t("investor.diInstagram")}</td><td>{t("investor.diInstagramDetail")}</td><td className="inv-done">{t("investor.statusActive")}</td></tr>
            <tr><td>{t("investor.diLanguages")}</td><td>{t("investor.diLanguagesDetail")}</td><td className="inv-done">{t("investor.statusActive")}</td></tr>
            <tr><td>{t("investor.diTrademark")}</td><td>{t("investor.diTrademarkDetail")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
          </tbody>
        </table>

        <h3 className="inv-sub">{t("investor.subBrandMat")}</h3>
        <table className="inv-table">
          <tbody>
            <tr><td>{t("investor.bmLogo")}</td><td>{t("investor.bmLogoDetail")}</td><td className="inv-done">{t("investor.statusDone")}</td></tr>
            <tr><td>{t("investor.bmBrandDoc")}</td><td>{t("investor.bmBrandDocDetail")}</td><td className="inv-done">{t("investor.statusDone")}</td></tr>
            <tr><td>{t("investor.bmCatalogue")}</td><td>{t("investor.bmCatalogueDetail")}</td><td className="inv-done">{t("investor.statusDone")}</td></tr>
            <tr><td>{t("investor.bmTrademark")}</td><td>{t("investor.bmTrademarkDetail")}</td><td className="inv-done">{t("investor.statusDone")}</td></tr>
            <tr><td>{t("investor.bmIG")}</td><td>{t("investor.bmIGDetail")}</td><td className="inv-done">{t("investor.statusDone")}</td></tr>
          </tbody>
        </table>
      </section>

      {/* 4. ROADMAP */}
      <section className="inv-section">
        <h2 className="inv-section__title">{t("investor.roadmapTitle")}</h2>
        <div className="inv-section__divider" />

        <h3 className="inv-sub inv-sub--phase">{t("investor.phaseImmediate")}</h3>
        <table className="inv-table">
          <thead><tr><th>{t("investor.thNum")}</th><th>{t("investor.thTask")}</th><th>{t("investor.thOwner")}</th><th>{t("investor.thStatus")}</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>{t("investor.task1")}</td><td>{t("investor.ownerFounder")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
            <tr><td>2</td><td>{t("investor.task2")}</td><td>{t("investor.ownerFounder")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
            <tr><td>3</td><td>{t("investor.task3")}</td><td>{t("investor.ownerDeveloper")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
          </tbody>
        </table>

        <h3 className="inv-sub inv-sub--phase">{t("investor.phaseShort")}</h3>
        <table className="inv-table">
          <thead><tr><th>{t("investor.thNum")}</th><th>{t("investor.thTask")}</th><th>{t("investor.thOwner")}</th><th>{t("investor.thStatus")}</th></tr></thead>
          <tbody>
            <tr><td>4</td><td>{t("investor.task4")}</td><td>{t("investor.ownerDeveloper")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
            <tr><td>5</td><td>{t("investor.task5")}</td><td>{t("investor.ownerDeveloper")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
            <tr><td>6</td><td>{t("investor.task6")}</td><td>{t("investor.ownerFounder")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
            <tr><td>7</td><td>{t("investor.task7")}</td><td>{t("investor.ownerDeveloper")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
            <tr><td>8</td><td>{t("investor.task8")}</td><td>{t("investor.ownerFounder")}</td><td className="inv-pending">{t("investor.statusPending")}</td></tr>
            <tr><td>9</td><td>{t("investor.task9")}</td><td>{t("investor.ownerSocial")}</td><td className="inv-active">{t("investor.statusActive")}</td></tr>
          </tbody>
        </table>

        <h3 className="inv-sub inv-sub--phase">{t("investor.phaseMedium")}</h3>
        <table className="inv-table">
          <thead><tr><th>{t("investor.thNum")}</th><th>{t("investor.thTask")}</th><th>{t("investor.thOwner")}</th></tr></thead>
          <tbody>
            <tr><td>10</td><td>{t("investor.task10")}</td><td>{t("investor.ownerDeveloper")}</td></tr>
            <tr><td>11</td><td>{t("investor.task11")}</td><td>{t("investor.ownerFounderSocial")}</td></tr>
            <tr><td>12</td><td>{t("investor.task12")}</td><td>{t("investor.ownerFounder")}</td></tr>
            <tr><td>13</td><td>{t("investor.task13")}</td><td>{t("investor.ownerFounder")}</td></tr>
            <tr><td>14</td><td>{t("investor.task14")}</td><td>{t("investor.ownerFounder")}</td></tr>
            <tr><td>15</td><td>{t("investor.task15")}</td><td>{t("investor.ownerSocial")}</td></tr>
          </tbody>
        </table>

        <h3 className="inv-sub inv-sub--phase">{t("investor.phaseLong")}</h3>
        <table className="inv-table">
          <thead><tr><th>{t("investor.thNum")}</th><th>{t("investor.thTask")}</th><th>{t("investor.thOwner")}</th></tr></thead>
          <tbody>
            <tr><td>16</td><td>{t("investor.task16")}</td><td>{t("investor.ownerDeveloper")}</td></tr>
            <tr><td>17</td><td>{t("investor.task17")}</td><td>{t("investor.ownerFounder")}</td></tr>
            <tr><td>18</td><td>{t("investor.task18")}</td><td>{t("investor.ownerDeveloper")}</td></tr>
            <tr><td>19</td><td>{t("investor.task19")}</td><td>{t("investor.ownerFounder")}</td></tr>
            <tr><td>20</td><td>{t("investor.task20")}</td><td>{t("investor.ownerAll")}</td></tr>
            <tr><td>21</td><td>{t("investor.task21")}</td><td>{t("investor.ownerFounder")}</td></tr>
            <tr><td>22</td><td>{t("investor.task22")}</td><td>{t("investor.ownerAll")}</td></tr>
          </tbody>
        </table>
      </section>

      {/* 5. FILE MAP */}
      <section className="inv-section">
        <h2 className="inv-section__title">{t("investor.filesTitle")}</h2>
        <div className="inv-section__divider" />
        <table className="inv-table">
          <thead><tr><th>{t("investor.thFolder")}</th><th>{t("investor.thDescription")}</th></tr></thead>
          <tbody>
            <tr><td>{t("investor.folderWebsite")}</td><td>{t("investor.folderWebsiteDesc")}</td></tr>
            <tr><td>{t("investor.folderBrand")}</td><td>{t("investor.folderBrandDesc")}</td></tr>
            <tr><td>{t("investor.folderIG")}</td><td>{t("investor.folderIGDesc")}</td></tr>
            <tr><td>{t("investor.folderLogo")}</td><td>{t("investor.folderLogoDesc")}</td></tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* CAPEX TAB                                                 */
/* ══════════════════════════════════════════════════════════ */
function CapexTab() {
  const { t, locale } = useLanguage();

  const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTHS_TR = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  const MONTHS_DE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const months = locale === "tr" ? MONTHS_TR : locale === "de" ? MONTHS_DE : MONTHS_EN;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const fmtEur = (n: number) => `€\u00A0${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`;
  const fmtEurDec = (n: number) => `€\u00A0${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
  const fmtTL = (n: number) => `₺\u00A0${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)}`;
  const fmtRate = (n: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(n);
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  const { partners, expenses, forecast, totals } = capexData;
  const progressPct = (totals.paidEUR / totals.totalEUR) * 100;

  // Calculate each partner's total contribution from expenses
  const partnerTotals = useMemo(() =>
    partners.map((_, pi) =>
      expenses.reduce((sum, e) => sum + (e.partners[pi] ?? 0), 0)
    ), []
  );

  // Expected share of grand total EUR for each partner
  const partnerExpected = useMemo(() =>
    partners.map(p => (p.share / 100) * totals.totalEUR), []
  );

  return (
    <main className="capex">
      <h2 className="capex__title">{t("investor.capexTitle")}</h2>
      <div className="capex__divider" />

      {/* KPI CARDS */}
      <div className="capex-kpis">
        <div className="capex-kpi">
          <span className="capex-kpi__label">{t("investor.capexPaid")}</span>
          <span className="capex-kpi__value">{fmtEur(totals.paidEUR)}</span>
        </div>
        <div className="capex-kpi">
          <span className="capex-kpi__label">{t("investor.capexForecast")}</span>
          <span className="capex-kpi__value">{fmtEur(totals.forecastEUR)}</span>
        </div>
        <div className="capex-kpi">
          <span className="capex-kpi__label">{t("investor.capexTotal")}</span>
          <span className="capex-kpi__value">{fmtEur(totals.totalEUR)}</span>
        </div>
        <div className="capex-kpi capex-kpi--accent">
          <span className="capex-kpi__label">{t("investor.capexProgress")}</span>
          <span className="capex-kpi__value">{fmtPct(progressPct)}</span>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="capex-progress">
        <div className="capex-progress__bar">
          <div className="capex-progress__fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="capex-progress__labels">
          <span>{t("investor.capexPaid")}: {fmtEur(totals.paidEUR)}</span>
          <span>{t("investor.capexTotal")}: {fmtEur(totals.totalEUR)}</span>
        </div>
      </div>

      {/* PARTNER CONTRIBUTIONS */}
      <section className="capex-section">
        <h3 className="capex-section__title">{t("investor.capexPartners")}</h3>
        <table className="capex-partner-table">
          <thead>
            <tr>
              <th>{t("investor.capexName")}</th>
              <th>{t("investor.capexShare")}</th>
              <th style={{textAlign:"right"}}>{t("investor.capexContributed")}</th>
              <th style={{textAlign:"right"}}>{t("investor.capexRemaining")}</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p, i) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{fmtPct(p.share)}</td>
                <td style={{textAlign:"right"}}>{fmtEurDec(partnerTotals[i])}</td>
                <td style={{textAlign:"right"}}>{fmtEurDec(Math.max(0, partnerExpected[i] - partnerTotals[i]))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>{locale === "tr" ? "Toplam" : locale === "de" ? "Gesamt" : "Total"}</strong></td>
              <td><strong>100%</strong></td>
              <td style={{textAlign:"right"}}><strong>{fmtEurDec(partnerTotals.reduce((a, b) => a + b, 0))}</strong></td>
              <td style={{textAlign:"right"}}><strong>{fmtEurDec(Math.max(0, totals.totalEUR - partnerTotals.reduce((a, b) => a + b, 0)))}</strong></td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* EXPENSE TABLE */}
      <section className="capex-section">
        <h3 className="capex-section__title">{t("investor.capexTitle")}</h3>
        <div className="capex-table-scroll">
          <table className="capex-table">
            <thead>
              <tr>
                <th>{t("investor.capexDate")}</th>
                <th>{t("investor.capexItem")}</th>
                <th style={{textAlign:"right"}}>{t("investor.capexTL")}</th>
                <th style={{textAlign:"right"}}>{t("investor.capexRate")}</th>
                <th style={{textAlign:"right"}}>{t("investor.capexEUR")}</th>
                <th>{t("investor.capexStatus")}</th>
                {partners.map(p => <th key={p.name} style={{textAlign:"right"}}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={i}>
                  <td>{fmtDate(e.date)}</td>
                  <td>{e.item}</td>
                  <td className="capex-td--num">{fmtTL(e.tl)}</td>
                  <td className="capex-td--num">{fmtRate(e.eurRate)}</td>
                  <td className="capex-td--num">{fmtEurDec(e.eur)}</td>
                  <td>
                    <span className={`capex-badge ${e.status === "paid" ? "capex-badge--paid" : "capex-badge--pending"}`}>
                      {e.status === "paid" ? t("investor.capexPaidLabel") : t("investor.capexStatus")}
                    </span>
                  </td>
                  {e.partners.map((v, pi) => (
                    <td key={pi} className="capex-td--num" style={{color: v === 0 ? "rgba(0,0,0,.15)" : undefined}}>
                      {v === 0 ? "—" : fmtEurDec(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td><strong>{locale === "tr" ? "Toplam" : locale === "de" ? "Gesamt" : "Total"}</strong></td>
                <td className="capex-td--num"><strong>{fmtTL(totals.paidTL)}</strong></td>
                <td></td>
                <td className="capex-td--num"><strong>{fmtEurDec(totals.paidEUR)}</strong></td>
                <td></td>
                {partnerTotals.map((pt, i) => (
                  <td key={i} className="capex-td--num"><strong>{fmtEurDec(pt)}</strong></td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* FORECAST */}
      <section className="capex-section capex-forecast">
        <h3 className="capex-section__title">{t("investor.capexForecastSection")}</h3>
        <table className="capex-forecast-table">
          <thead>
            <tr>
              <th>{t("investor.capexItem")}</th>
              <th style={{textAlign:"right"}}>{t("investor.capexTL")}</th>
              <th style={{textAlign:"right"}}>{t("investor.capexRate")}</th>
              <th style={{textAlign:"right"}}>{t("investor.capexEUR")}</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((f, i) => (
              <tr key={i}>
                <td>{f.item}</td>
                <td className="capex-td--num">{fmtTL(f.tl)}</td>
                <td className="capex-td--num">{fmtRate(f.eurRate)}</td>
                <td className="capex-td--num">{fmtEurDec(f.eur)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>{locale === "tr" ? "Toplam" : locale === "de" ? "Gesamt" : "Total"}</strong></td>
              <td className="capex-td--num"><strong>{fmtTL(totals.forecastTL)}</strong></td>
              <td></td>
              <td className="capex-td--num"><strong>{fmtEurDec(totals.forecastEUR)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  );
}
