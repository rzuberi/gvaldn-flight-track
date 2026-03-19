# gvaldn-flight-track

Weekend flight tracker for Geneva and London airport pairs.

## What this version does

- Looks from the current date through the next 12 months.
- Generates direct short-trip combinations across the next 12 months.
- Lets the user choose acceptable outbound weekdays and acceptable return weekdays.
- Lets the user choose an outbound departure-hour window and a return arrival-hour window.
- Ranks route/date combinations for `GVA -> London airport` by default.
- Lets the user flip direction to `London airport -> GVA`.
- Only shows direct flights.
- Allows mixed airlines across the round trip, for example easyJet outbound and SWISS inbound.
- Groups results by month with a date-first card layout.
- Keeps all filters visible on the page instead of hiding them in dropdown panels.
- Adds airline-first lookup links for each result where supported, plus a copyable search prompt and Google fallback.

## Current data mode

This release uses a deterministic mock pricing model so the UI, ranking logic, and lookup flow can be validated immediately.

It is not yet connected to a live fare API, so prices and displayed times are still indicative and must be checked on the airline site.

## Why it is built this way

The frontend is static and GitHub Pages friendly. Real 12-month fare ranking needs a server-side provider with credentials and caching, so the next step is adding an API backend and replacing the mock fare generator in `src/lib/flight-data.ts`.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages

This repo includes a Pages workflow in `.github/workflows/deploy.yml`.

To publish:

1. In the GitHub repo settings, open **Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main`.
