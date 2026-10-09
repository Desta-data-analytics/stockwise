# Verification · version 0.2 · 9 October 2026

Story: historical UCI sales or imported daily data → schema validation → rolling horizon backtest → forecast selection → inventory scenario → replenishment plan; optional operator login → explicit save → private persistent server state → authenticated CSV response.

## Evidence
- 18 tests pass, including real dataset schema and multi-horizon finite outputs, baseline math, temporal separation, CSV rejection/roundtrip, safe exports, scrypt credential verification, session invalidation and rate limiting.
- Filesystem tests recreate the store and recover saved data; simultaneous stale saves yield one success and one 409; invalid writes do not replace valid state; prior revision remains available.
- Live HTTP integration opens a temporary server with disposable credentials/data: health 200; unauthenticated workspace 401; server module path 404; wrong Origin/CSRF 403; wrong password 401; valid login 200; invalid schema 400; valid save 200; stale save 409; authenticated export 200 with GBP CSV body; logout invalidates access.
- npm run check and npm run build succeed. CI definition added, but no remote CI run is claimed.
- Browser loads 12 real sales series, correct historical date and GBP amounts. Forecast page shows five models, actual MAE/WAPE and 28 rolling origins; horizon change 14→28 recomputes scores and chart. High error is called out for manual review.
- Operator dialog displays configured/disabled state honestly; local default has no operator password configured. Full authenticated browser save was not exercised; the API flow is tested directly.
- Original vector mark displays as logo/favicon. Desktop view inspected. Mobile 390px layout inspected and document width equals viewport width; dense tables scroll within their panels.
- No browser console errors observed in the inspected flow. Preview saved at docs/preview-v2.jpg.

## Dataset preparation evidence
UCI archive downloaded from its official source. SHA-256 and preparation counts are recorded in public/data/provenance.json. 541,909 original rows scanned; window 2011-06-01 to 2011-11-30; 272,952 UK positive sale rows remain after filters across the source catalog. Final public subset is 12 products × 183 dates. No customer IDs bundled. Stock, buying costs, categories and lead times are constructed and labeled.

## Remaining deployment gates
No live production host, HTTPS certificate, actual Secure cookie in deployed environment, container run, host-volume recovery, off-host backup, load test, independent security assessment or multi-tenant validation is claimed. Runtime is one operator/workspace/process with persistent volume. Sessions/rate limits are process-local. Setup instructions and deployment constraints are in DEPLOYMENT.md.

## Indonesia update · 9 October 2026
Direct Kaggle download verified CC0 and explicit simulation declaration in included README. All 55,000 unique transaction IDs retained and 114,889 units conserved in 26 × 366 daily rows. No customer/order identifiers bundled. 19 tests pass, including IDR/source persistence and all forecast horizons; npm run check/build pass.

Browser: selected Indonesia via Data workspace → Load selected dataset; observed 26 products, simulation banner, dates, IDR source costs; overview survives reload with Indonesian guest workspace. Desktop 1440 × 1000 and phone 390 × 844 screenshots inspected; phone client/scroll width both 390. Console error log query empty. Screenshot docs/preview-indonesia.jpg. Existing workspaces intentionally remain until explicit replacement. New public workspaces default to Indonesia.

Portfolio case study contains measured baseline results and a post draft. Public deployment/repository URLs are not established by this update; production host/HTTPS/backup checks remain outstanding.
