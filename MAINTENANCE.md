# Maintenance Guardrails

## Objective
Keep the project stable when adding features or doing maintenance.

## Critical Contracts
- `index.html` must keep these scripts:
  - `./src/core/app-core.js`
  - `./src/tools/report/report-app.js`
  - `./src/tools/csv/csv-app.js`
- RED route contract:
  - `red.html` must load `./stylesred.css` and `./red.js`.
- Global integration contract:
  - `window.CsvApp`
  - `window.ReportApp`
  - `window.handleSmartCsvUpload`

## Service Worker Contract
- `sw.js` cache list must include:
  - `./index.html`
  - `./red.html`
  - `./stylesred.css`
  - `./red.js`

## Before Any Merge
1. Run smoke tests: `npm run test:smoke`
2. Run e2e tests: `npm run test:e2e`
3. Validate RED flow and main flow manually in browser.
4. Check that links with accents still resolve (`escala_presença.html`).

## Rule of Thumb
If a module file/path changes, update:
- `index.html`
- `sw.js`
- `tests/smoke/run-smoke.mjs`
- docs (`ARCHITECTURE.md` / `README.md`)
