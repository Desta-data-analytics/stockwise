# Architecture · v0.2

Native browser modules + Node 20.19/22 HTTP backend. No third-party runtime dependencies. Container target with one Node process and persistent volume. Authentication is a limited single-operator mechanism, not a user-management platform: salted scrypt password hash from deployment configuration, random 256-bit session token stored only as a digest in memory, 8-hour HttpOnly/SameSite=Strict cookie, Secure in production. Login attempts are limited by direct peer IP. All mutations enforce exact configured Origin; authenticated mutations also require a per-session CSRF token. Private APIs are unavailable without configured credentials. Production refuses HTTP origin or invalid hash.

Data flow: public Indonesian simulation / UCI-derived daily dataset or CSV → validation → pure forecasting engine → scenario inventory plan → UI/CSV. Guest changes use versioned localStorage; authenticated data is loaded from server and never written into guest storage. Explicit Save workspace PUT validates again on the server, serializes writes, enforces revision, fsyncs and atomically renames. A previous valid revision is retained. Readable public assets never expose server modules, credentials or private state. Successful private export recomputes the plan from the saved server data.

Modules: src/domain.js (forecast/planning), src/csv.js (schema and safe exports), src/app.js (UI/state/auth client), server/auth.mjs (bounded sessions/login limiter), server/store.mjs (validated persistent workspace), scripts/server.mjs (security headers/static/API), scripts/prepare_dataset.py (reproducible UCI aggregation), scripts/prepare_indonesia.py (reproducible CC0 Indonesian simulation aggregation), scripts/build.mjs (static assets).

## API contract
GET /api/session → configured/authenticated and session request token when authenticated.
POST /api/login {password} → cookie + request token.
POST /api/logout → revoke session.
GET /api/workspace → stored canonical workspace or null.
PUT /api/workspace {csv,scenario,currency,source,selected,revision} → new revision/date; invalid schema 400, unauthenticated 401, origin/token 403, stale revision 409.
GET /api/plan.csv → authenticated download from saved workspace.
GET /health → lightweight liveness.

## Forecasting
Five baselines: naive, 7-day average, weekly seasonal naive, 28-day average and fixed-alpha (0.3) exponential smoothing. Forecasts are nonnegative. At each rolling origin, use ONLY earlier data and predict the requested horizon. Horizon is 7/14/28 days, shortened to floor(n/3) for small imported histories. Up to 28 eligible origins are evaluated. Select lowest daily MAE; report WAPE (null when actual sum is zero), actual horizon and origin count. Overlapping test windows are dependent and no independent error confidence is claimed. Product assortment selection is based on source-window eligibility, not a model-accuracy benchmark. Historical backtest does not guarantee future accuracy.

Inventory: L = ceil(base lead time × scenario multiplier), R = review days, H = L+R. Forecast H days with scenario demand factor. Buffer = ceil(buffer multiplier × sample daily standard deviation of last 28 observations × sqrt(H) × demand factor). Target = ceil(sum H-day forecasts + buffer). Order = max(0,target−on-hand). Cost = order × assumed purchase cost. Urgent if on-hand < forecast lead-time demand; otherwise reorder if order>0. Coverage divides stock by projected daily mean; zero-demand coverage is null. No actual confidence/service-level guarantee. Incoming orders, reservations, MOQ and constrained budgets remain out of scope.

Storage maximum: UTF-8 CSV 2MB, 50,000 rows; JSON HTTP payload 3MB. Duplicate dates checked with sets. Private JSON files, one workspace, single writer process; not a relational database. Horizontal scaling requires replacing persistence, sessions and rate limiting with shared transactional services. See DEPLOYMENT.md for HTTPS, backup, recovery and release gates. See DATASET.md for actual vs assumed fields.
