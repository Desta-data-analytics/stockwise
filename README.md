# Stockwise

Demand forecasting and inventory planning with traceable datasets, explainable baselines and reviewable replenishment recommendations.

[Live demo](https://desta-data-analytics.github.io/stockwise/) · [Repository](https://github.com/Desta-data-analytics/stockwise)

![Project preview](docs/media/project-collage.jpg)

## Problem and user workflow
Stockwise helps a retail analyst answer three connected questions: what demand might look like next, which products may run out before replenishment arrives, and how much a proposed purchase would cost. The output is a reviewable plan rather than an automatic supplier order.

1. Open **Overview** to inspect demand, stock risk and estimated replenishment spending.
2. Compare observed sales and the selected baseline in **Demand forecast**.
3. Change stock, purchase cost, supplier lead time, review interval or demand multiplier.
4. Review suggested quantities and cost in **Purchase plan**, then export a CSV.
5. Use **Data workspace** to inspect provenance or import your own daily sales.

## Dataset and reproducible pipeline
| Dataset | Sales provenance | Prepared series | Currency |
| --- | --- | --- | --- |
| Indonesian retail | CC0 simulation, 55,000 transactions across 25 cities and four channels in 2024 | 26 products × 366 days = 9,516 observations | IDR |
| UCI Online Retail | Real historical UK transactions; filtered and aggregated derivative | 12 products × 183 days | GBP |

The Indonesian source contains simulated sales and production costs. Preparation pools cities and channels into a central inventory view, retains all 26 products and creates complete daily series. Purchase costs are derived from median simulated production cost per unit. On-hand stock and lead times are explicit planning assumptions. The source accounts for 114,889 units; preparation preserves the unit total.

`scripts/prepare_indonesia.py` prepares the Indonesian derivative; `scripts/prepare_dataset.py` prepares the UCI comparison. Source hashes, transformation rules and licensing are documented in [dataset documentation](docs/DATASET.md) and `public/data/indonesia-provenance.json`. Raw customer identifiers are not shipped.

## Forecasting and inventory calculation
Five interpretable baselines are compared: last observation, 7-day mean, weekly seasonal naive, 28-day mean and exponential smoothing with alpha 0.3. Rolling origins fit each model only on earlier observations. Supported evaluation horizons are 7, 14 and 28 days, with shorter horizons for small imported histories and up to 28 eligible origins.

The lowest daily MAE selects the model for each product. WAPE divides absolute forecast error by total actual demand; it is unavailable when actual demand totals zero. Evaluation windows overlap, and selection uses these same windows: the displayed result is a historical model-selection diagnostic, not an independent holdout benchmark or a future accuracy guarantee.

For effective lead time `L` and review interval `R`, the planning period is `H = L + R`:

```text
buffer = ceil(buffer multiplier × recent daily standard deviation × sqrt(H) × demand factor)
target = ceil(projected demand over H days + buffer)
order quantity = max(0, target − on-hand stock)
estimated purchase cost = order quantity × purchase cost per unit
```

The buffer is a volatility heuristic, not a calibrated service-level guarantee. Incoming orders, reservations, MOQ, warehouse capacity and constrained purchasing budgets are not modeled.

## Architecture and storage modes
```text
Public dataset / CSV
        ↓
Schema and value validation
        ↓
Pure forecast engine → scenario-based inventory plan
        ↓
Browser views / safe CSV export
```

| Module | Responsibility |
| --- | --- |
| `src/domain.js` | Forecasts, temporal backtests, risk and order calculations |
| `src/csv.js` | Input validation and formula-safe CSV exports |
| `src/app.js` | Navigation, scenarios, charts and workspace interaction |
| `server/auth.mjs` | Optional operator sessions and login limits |
| `server/store.mjs` | Validated atomic writes and revision conflict handling |
| `scripts/build-pages.mjs` | Static Pages build and repository base path |

**GitHub Pages:** browser-local guest exploration; no operator API or server persistence. **Optional Node deployment:** one authenticated operator, one private workspace, explicit saves and a durable volume. Browser guest state and authenticated server state are separate. This repository does not contain a deployed conversational AI agent; the AI agents document describes development responsibilities and possible future contracts.

## Validation and limitations
The automated suite covers numerical invariants, forecast horizons, source-unit conservation, CSV validation/export, state persistence and the optional authenticated HTTP flow. Run the checks below to validate your checkout. Passing local tests does not establish security certification, independent forecast performance, or operational business impact.

## Run
Requires Node 20.19+ or 22. No package installation or API key is needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. New public workspaces explore Indonesian simulated sales (UCI real UK sales remains selectable); private operator access is disabled until configured. For persistent server workspace, copy .env.example to .env, run `npm run password` privately, set the returned OPERATOR_PASSWORD_HASH and restart. Never commit a password/hash. Use explicit Save workspace after signing in.

```sh
npm test
npm run check
npm run build
```

## Features
- 55,000 Indonesian simulated transactions → 26 products × 366 days in IDR, with CC0 provenance and reproducible Python preparation.
- 12 real UCI product series × 183 calendar days, with provenance, source/license attribution and reproducible preparation.
- Five baseline models evaluated at rolling 7/14/28-day origins; MAE/WAPE computed from historical held-out data.
- Forecast visualization, inventory risk, adjustable stock/cost/lead time and demand scenarios.
- Validated CSV ingestion, formula-safe exports and selectable imported-data currency; no implicit FX conversion.
- Guest browser persistence and authenticated server persistence with revision conflict handling, atomic writes and previous revision.
- Production configuration validation, CSP, origin/CSRF enforcement, limited operator sessions, login rate limiting, nonroot Docker image and CI configuration.

## Documents
[PRD](docs/PRD.md) · [Design system](docs/DESIGN_SYSTEM.md) · [Architecture](docs/ARCHITECTURE.md) · [Dataset](docs/DATASET.md) · [Deployment](docs/DEPLOYMENT.md) · [Verification](docs/VERIFICATION.md) · [AI agents](docs/AI_AGENTS.md) · [Portfolio case study and post draft](docs/PORTFOLIO_CASE_STUDY.md).

## Scope and attribution
Single operator, one workspace, one process with a persistent volume. Not a multi-tenant SaaS. Indonesian default sales/costs are explicitly synthetic; UCI comparison sales are real historical observations. Inventory and supplier lead times are planning assumptions. Server data is private to the operator; guest exploration is separate. No automatic purchases or external AI provider.

Dataset: Chen, D. (2015), Online Retail, UCI Machine Learning Repository, https://doi.org/10.24432/C5BW33. CC BY 4.0. This derivative aggregates and filters transactions. See docs/DATASET.md and public/data/provenance.json. No raw customer identifiers are bundled.

Deployment still requires HTTPS, secrets, durable volume and tested off-host backup/recovery. Local tests do not prove live hosting, HA, or independent security certification.

## Public hosting
GitHub Pages runs the static guest demo. It stores data in the visitor browser and has no operator API. `npm run build:pages` prepares `/stockwise/`; pushes to main run validation and the Pages workflow. Node operator deployment remains separate.
