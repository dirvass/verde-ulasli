# VERDE ULAŞLI — Turkey's First Agro-Luxury Villa Resort

Live: **https://verde-ulasli.com**

Two twin villas on 5,500 m² of living land in Ulaşlı, Kocaeli.

## Pages

| Route | Visibility | Description |
|-------|-----------|-------------|
| `/` | Public | Home — hero, agro-luxury intro, two villas, experiences, location map, CTA, footer |
| `/story` | Public | Our Story — 10-section narrative (medieval history, philosophy, agro-culture, Verde etymology with وردة, location distances) |
| `/experience` | Public | Experiences — 10 experience cards + 4 seasonal packages (Uyanış, Altın Saat, Hasat, Sığınak) |
| `/gallery` | Public | Gallery — 34 media items (Exterior, Interior, Construction) with lightbox + Kuzu Yayla video |
| `/book` | Public | Booking — 5-step guided flow, enquiry-based pricing (no public prices), 6 included experiences |
| `/investor` | Private | Investor Portal — Financials tab (KPI cards, interactive chart, villa table, 3 scenario breakdowns, ROI comparison, growth strategy) + Brand tab (project overview, brand identity, completed work, roadmap, file map) |
| `/admin` | Private | Availability manager — add/edit/remove booked dates per villa |

## Brand Identity

**VERDE** = Italian for "green" — the colour of paradise in Islamic tradition (وردة, warda), the language of Italian elegance, and the essence of the land.

### Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--verde-deep` | `#0E1A16` | Hero overlays, footer, dark sections |
| `--brand` | `#2D5040` | Buttons, links, accents |
| `--sand` | `#C9B99A` | Warm accents |
| `--gold` | `#C3A564` | Luxury accents, dividers |
| `--mist` | `#EBE8E1` | Light text on dark backgrounds |

### Typography
- Headings: Playfair Display (serif)
- Body: Inter (sans-serif)
- Arabic: Noto Sans Arabic

## Tech Stack

- **React 18** + **TypeScript** + **Vite 5**
- **react-router-dom** v6 (SPA routing)
- **Recharts** (area charts — financial projections)
- **react-day-picker** + **date-fns** (booking calendar)
- **Cloudflare Pages** (auto-deploy on push to main)
- Custom CSS with CSS custom properties (no framework)

## Navigation

- **Desktop**: centered minimal text links with gold active underline
- **Mobile** (< 768px): hamburger icon → fullscreen dark overlay with large serif links + language selector

## Internationalisation

4 languages: **English**, **Turkish**, **Arabic** (RTL), **German**.

- Translation files: `src/i18n/{en,tr,ar,de}.json`
- React Context-based i18n with `t()` function
- Auto-detect from browser locale, override with `?lang=` URL param
- Language selector in nav (desktop: inline text, mobile: overlay pill buttons)
- Preference persisted in localStorage

## SEO

- `usePageMeta` hook: dynamic title/description/OG tags per page per language
- `sitemap.xml`: public pages indexed
- `robots.txt`: /investor and /admin blocked
- SPA navigation: all internal links use `<Link>` for instant transitions

## Feature Flags

| Flag | File | Default | Purpose |
|------|------|---------|---------|
| `SHOW_PRICING` | `BookingPage.tsx` | `false` | Toggle pricing breakdown visibility |

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `TopNav` | `src/components/TopNav.tsx` | Desktop nav + mobile hamburger/overlay |
| `Footer` | `src/components/Footer.tsx` | Global footer (dark verde bg, nav links, contact) |
| `LocationMap` | `src/components/LocationMap.tsx` | SVG geographic map of Marmara region |
| `LanguageSelector` | `src/components/LanguageSelector.tsx` | EN/TR/AR/DE toggle |
| `PasswordGate` | `src/components/PasswordGate.tsx` | Password protection for private routes |
| `NotFoundPage` | `src/NotFoundPage.tsx` | Branded 404 page with i18n |

## Media Structure

```
public/media/
  dis-mekan/       # Exterior renders
  ic-mekan/        # Interior renders
  insaat-sureci/   # Construction photos
  videolar/        # Videos (construction + Kuzu Yayla)
```

## Digital Assets

| Asset | Value |
|-------|-------|
| Domain | verde-ulasli.com (Cloudflare Registrar) |
| Hosting | Cloudflare Pages |
| GitHub | github.com/dirvass/verde-ulasli |
| Email | info@verde-ulasli.com / reservations@verde-ulasli.com |
| Instagram | @verde.ulasli |

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

## Private Links

- **Investor Portal**: https://verde-ulasli.com/investor
- **Admin Extranet**: https://verde-ulasli.com/admin
