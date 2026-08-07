# CAPEX live sync — design

**Date:** 2026-08-08
**Status:** approved (live mode chosen over nightly rebuild)

## Goal

The /investor CAPEX tab should always show the current numbers from the
expenses Google Sheet without a manual export → capex.json → deploy cycle.

## Approach

A new Cloudflare Pages Function proxies and parses the sheet's CSV export.
The React page fetches it at view time and falls back to the bundled
`src/data/capex.json` snapshot when the API is unavailable.

```
Google Sheet (link-shared)
   └─ CSV export URL
        └─ GET /api/capex  (Pages Function, edge-cached 5 min)
             └─ CapexTab fetch on mount
                  └─ fallback: bundled capex.json (last synced snapshot)
```

## Components

### functions/api/capex.ts (new)

- `GET /api/capex` only. No auth: the same data already ships in the public
  JS bundle today, so the endpoint does not lower the bar.
- Env var **`CAPEX_SHEET_ID`** (Cloudflare Pages dashboard, same pattern as
  `ADMIN_TOKEN` / `APPS_SCRIPT_URL`). The repo is public, so the sheet id
  must never appear in code. Missing env → 503 `not-configured`.
- Fetches `https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=0`,
  parses it into the exact `capex.json` shape:
  - partner names from header row cols J–M, shares from row 2 percentages;
  - expense rows = rows with a parsable date above "Ödenen ara toplam"
    (all treated as paid — the sheet's paid subtotal includes them even when
    Statü is blank);
  - forecast rows = rows between "Öngörü" and "Öngörü toplam";
  - dates accept "26 Aug 2023" and "3/12/25" (d/m/yy) forms;
  - grand total excludes the standalone "Mobilya" forecast line (already
    inside "İnce inşaat, incl mobilya") — same convention as the sheet.
- Validation before returning: ≥ 50 expense rows, shares sum to 99–101,
  finite totals. Any failure → 502, client falls back.
- Edge cache 5 min via `caches.default` + `cache-control: public, max-age=300`.

### src/InvestorPage.tsx (CapexTab)

- `useState(capexData)` + one `useEffect` fetch of `/api/capex`; on any
  non-OK/parse failure the bundled snapshot stays. `useMemo` deps change
  from `[]` to `[data]`.

## Rollout (safe order)

1. Ship code. Endpoint returns 503 until `CAPEX_SHEET_ID` is set; the page
   renders the bundled snapshot exactly as before — zero user-visible change.
2. Set `CAPEX_SHEET_ID` in the Pages dashboard (or via `wrangler pages
   secret put` after `wrangler login`).
3. Verify `/api/capex` totals match the sheet's printed subtotals.

## Error handling

| Failure | Behaviour |
|---|---|
| Env var missing | 503 → bundled snapshot |
| Google unreachable / non-200 | 502 → bundled snapshot |
| Sheet format drift (validation fails) | 502 → bundled snapshot |
| Sheet sharing turned off | Google returns HTML/302 → parse fails → 502 → snapshot |

## Testing

- Parser logic verified against the real CSV (same maths already reconciled
  to the cent against the sheet's subtotals on 2026-08-07).
- After deploy: `curl /api/capex` totals vs sheet; page render check.

## Out of scope

- Auth on the endpoint (parity with today's public bundle).
- Automatic refresh of the bundled fallback snapshot.
- The one mistyped sheet date ("27 Apr 2023", actually Apr 2026) — fix in
  the sheet itself, not in code.
