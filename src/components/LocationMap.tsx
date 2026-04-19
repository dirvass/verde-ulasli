import React from "react";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Professional geographic map — Marmara region.
 * Topographic style, VERDE palette, luxury aesthetic.
 * Based on actual coordinates of the region.
 */

interface Place {
  labelKey: string;
  time: string;
  query: string;
  x: number;
  y: number;
  align: "l" | "r" | "t" | "b";
  size?: "lg" | "sm";
}

const PLACES: Place[] = [
  { labelKey: "map.istanbul",  time: "70 min",  query: "Istanbul, Turkey",                 x: 115, y: 130, align: "l", size: "lg" },
  { labelKey: "map.airport",   time: "50 min",  query: "Sabiha Gokcen Airport, Istanbul",  x: 275, y: 148, align: "t" },
  { labelKey: "map.izmit",     time: "30 min",  query: "Izmit, Kocaeli, Turkey",           x: 628, y: 242, align: "r" },
  { labelKey: "map.dining",    time: "20 min",  query: "Golcuk Kocaeli, Turkey",           x: 548, y: 288, align: "r" },
  { labelKey: "map.kartepe",   time: "1 hr",    query: "Kartepe Kocaeli, Turkey",          x: 740, y: 258, align: "r" },
  { labelKey: "map.marmara",   time: "30 min",  query: "Marmara Sea",                      x: 315, y: 348, align: "l" },
  { labelKey: "map.iznik",     time: "45 min",  query: "Iznik Bursa, Turkey",              x: 535, y: 488, align: "r", size: "lg" },
  { labelKey: "map.bursa",     time: "70 min",  query: "Bursa, Turkey",                    x: 180, y: 515, align: "l", size: "lg" },
  { labelKey: "map.uludag",    time: "2 hr",    query: "Uludag Bursa, Turkey",             x: 265, y: 562, align: "l" },
  { labelKey: "map.blacksea",  time: "1 hr",    query: "Black Sea Kocaeli, Turkey",        x: 650, y: 58,  align: "r" },
];

function mapsUrl(from: string, to: string): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`;
}

const VX = 498, VY = 322;

export default function LocationMap() {
  const { t } = useLanguage();

  return (
    <div className="loc-map">
      <svg viewBox="0 0 900 650" className="loc-map__svg" role="img" aria-label="Verde Ulaşlı regional map">
        <defs>
          {/* Gradients */}
          <linearGradient id="sea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a90b8" />
            <stop offset="100%" stopColor="#3a7ca5" />
          </linearGradient>
          <linearGradient id="land" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a4a3a" />
            <stop offset="100%" stopColor="#1e3a2c" />
          </linearGradient>
          <radialGradient id="vglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C3A564" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#C3A564" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#C3A564" stopOpacity="0" />
          </radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="2" /></filter>
          <filter id="txt-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
          </filter>

          {/* Topo pattern */}
          <pattern id="topo" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M0,30 Q15,25 30,30 Q45,35 60,30" fill="none" stroke="rgba(195,165,100,0.04)" strokeWidth="0.5" />
            <path d="M0,50 Q15,45 30,50 Q45,55 60,50" fill="none" stroke="rgba(195,165,100,0.03)" strokeWidth="0.5" />
            <path d="M0,10 Q15,5 30,10 Q45,15 60,10" fill="none" stroke="rgba(195,165,100,0.03)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* ── Land base ── */}
        <rect width="900" height="650" fill="url(#land)" rx="16" />
        <rect width="900" height="650" fill="url(#topo)" rx="16" />

        {/* ── Mountain ridges (subtle) ── */}
        <path d="M350,160 Q400,120 450,150 Q500,130 550,160 Q600,140 650,165 Q700,150 750,170"
          fill="none" stroke="rgba(195,165,100,0.06)" strokeWidth="12" />
        <path d="M100,400 Q200,370 300,395 Q400,375 500,400 Q600,380 700,405"
          fill="none" stroke="rgba(195,165,100,0.05)" strokeWidth="10" />

        {/* ── Water bodies ── */}

        {/* Black Sea */}
        <path d="M0,0 L900,0 L900,52 Q780,72 650,48 Q500,28 350,55 Q200,68 100,60 Q50,55 0,42 Z" fill="url(#sea)" />
        <text x="450" y="28" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="Inter,sans-serif" letterSpacing="6" fontWeight="300">KARADENIZ</text>

        {/* Marmara Sea */}
        <path d="M0,195 Q40,180 90,195 Q140,210 190,225 Q240,240 280,250 L298,278 Q260,300 220,325 Q180,345 140,358 Q100,368 60,372 Q30,375 0,365 Z" fill="url(#sea)" />
        <text x="95" y="295" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Inter,sans-serif" letterSpacing="4" fontWeight="300">MARMARA</text>

        {/* İzmit Gulf */}
        <path d="M278,248 Q310,240 360,245 Q420,250 480,255 Q540,258 600,256 Q640,255 680,258 Q700,260 710,262
               L710,278 Q700,280 680,278 Q640,280 600,278 Q540,280 480,278 Q420,275 360,272 Q310,268 278,275 Z"
          fill="url(#sea)" />
        <text x="480" y="270" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="Inter,sans-serif" letterSpacing="5" fontWeight="300">KÖRFEZİ</text>

        {/* İznik Lake */}
        <ellipse cx="532" cy="492" rx="82" ry="32" fill="url(#sea)" opacity="0.85" />
        <text x="532" y="497" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="Inter,sans-serif" letterSpacing="3" fontWeight="300">İZNİK GÖLÜ</text>

        {/* Sapanca Lake */}
        <ellipse cx="722" cy="298" rx="28" ry="10" fill="url(#sea)" opacity="0.75" />
        <text x="722" y="318" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="6" fontFamily="Inter,sans-serif" letterSpacing="2">SAPANCA</text>

        {/* ── Osmangazi Bridge ── */}
        <line x1="286" y1="256" x2="286" y2="272" stroke="#C3A564" strokeWidth="2" opacity="0.5" />
        <circle cx="286" cy="256" r="2" fill="#C3A564" opacity="0.5" />
        <circle cx="286" cy="272" r="2" fill="#C3A564" opacity="0.5" />
        <text x="268" y="250" textAnchor="end" fill="rgba(195,165,100,0.4)" fontSize="6" fontFamily="Inter,sans-serif" letterSpacing="1">OSMANGAZI</text>

        {/* ── Route lines ── */}
        {PLACES.map((p) => (
          <line key={p.labelKey + "-r"} x1={VX} y1={VY} x2={p.x} y2={p.y}
            stroke="rgba(195,165,100,0.18)" strokeWidth="0.8" strokeDasharray="3 5" />
        ))}

        {/* ── Destination markers ── */}
        {PLACES.map((p) => {
          const isLg = p.size === "lg";
          const r = isLg ? 4 : 3;
          let tx = p.x, ty = p.y;
          let anchor: "start" | "middle" | "end" = "start";
          let dy1 = 0, dy2 = 13;

          if (p.align === "l") { tx = p.x - 14; anchor = "end"; }
          else if (p.align === "r") { tx = p.x + 14; anchor = "start"; }
          else if (p.align === "t") { tx = p.x; ty = p.y - 16; anchor = "middle"; dy1 = 0; dy2 = 12; }
          else { tx = p.x; ty = p.y + 18; anchor = "middle"; dy1 = 0; dy2 = 12; }

          return (
            <a
              key={p.labelKey}
              href={mapsUrl("Ulaşlı, Kocaeli, Türkiye", p.query)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t(p.labelKey)} — directions`}
            >
              <g className="loc-map__marker">
                <circle cx={p.x} cy={p.y} r={r + 4} fill="rgba(235,232,225,0.06)" />
                <circle cx={p.x} cy={p.y} r={r} fill="#EBE8E1" />
                <text x={tx} y={ty + dy1} textAnchor={anchor} filter="url(#txt-shadow)"
                  fill="#EBE8E1" fontSize={isLg ? "11" : "9.5"} fontFamily="Inter,sans-serif"
                  fontWeight={isLg ? "600" : "500"} letterSpacing="0.3">
                  {t(p.labelKey)}
                </text>
                <text x={tx} y={ty + dy2} textAnchor={anchor}
                  fill="#C3A564" fontSize="8.5" fontFamily="Inter,sans-serif" fontWeight="600" letterSpacing="0.8">
                  {p.time}
                </text>
              </g>
            </a>
          );
        })}

        {/* ── VERDE marker ── */}
        <circle cx={VX} cy={VY} r="60" fill="url(#vglow)" />
        <circle cx={VX} cy={VY} r="18" fill="#2D5040" />
        <circle cx={VX} cy={VY} r="22" fill="none" stroke="#C3A564" strokeWidth="1.5" />
        <circle cx={VX} cy={VY} r="28" fill="none" stroke="rgba(195,165,100,0.12)" strokeWidth="0.8" strokeDasharray="2 4" />
        {/* Pin */}
        <path d={`M${VX},${VY - 6} L${VX - 3},${VY + 2} L${VX + 3},${VY + 2} Z`} fill="#C3A564" />
        <circle cx={VX} cy={VY - 8} r="3" fill="#C3A564" />

        <text x={VX} y={VY + 42} textAnchor="middle" filter="url(#txt-shadow)"
          fill="#C3A564" fontSize="13" fontFamily="Playfair Display,Georgia,serif"
          fontWeight="600" letterSpacing="4">VERDE</text>
        <text x={VX} y={VY + 56} textAnchor="middle"
          fill="rgba(195,165,100,0.55)" fontSize="8" fontFamily="Inter,sans-serif"
          letterSpacing="3" fontWeight="300">ULAŞLI</text>

        {/* ── Border frame ── */}
        <rect x="4" y="4" width="892" height="642" rx="14" fill="none"
          stroke="rgba(195,165,100,0.1)" strokeWidth="0.8" />

        {/* ── Compass ── */}
        <g transform="translate(850, 608)">
          <circle r="16" fill="none" stroke="rgba(195,165,100,0.2)" strokeWidth="0.8" />
          <text y="-3" textAnchor="middle" fill="rgba(195,165,100,0.5)" fontSize="9"
            fontFamily="Inter,sans-serif" fontWeight="600">N</text>
          <line x1="0" y1="3" x2="0" y2="10" stroke="rgba(195,165,100,0.3)" strokeWidth="0.8" />
        </g>

        {/* ── Legend ── */}
        <g transform="translate(30, 615)">
          <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(195,165,100,0.35)" strokeWidth="0.8" strokeDasharray="3 5" />
          <text x="28" y="3" fill="rgba(235,232,225,0.3)" fontSize="7" fontFamily="Inter,sans-serif" letterSpacing="1">DRIVING TIME</text>
          <circle cx="120" cy="0" r="3" fill="#EBE8E1" />
          <text x="130" y="3" fill="rgba(235,232,225,0.3)" fontSize="7" fontFamily="Inter,sans-serif" letterSpacing="1">DESTINATION</text>
        </g>
      </svg>
    </div>
  );
}
