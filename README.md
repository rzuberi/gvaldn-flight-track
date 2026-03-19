# gvaldn-flight-track

Weekend flight tracker for Geneva and London airport pairs.

## What this version does

- Looks from the current date through the next 12 months.
- Generates every upcoming `Thu -> Sun` and `Fri -> Sun` weekend.
- Ranks route/date combinations for `GVA -> London airport` by default.
- Lets the user flip direction to `London airport -> GVA`.
- Makes each result easy to identify with a route code, exact dates, carrier, stops, and a copyable search prompt.
- Adds direct lookup links for each result:
  - Skyscanner
  - KAYAK
  - Google search

## Current data mode

This release uses a deterministic mock pricing model so the UI, ranking logic, and external lookup flow can be validated immediately.

It is not yet connected to a live fare API.

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
