# Demand Forecasting & Inventory Planner

Version 0.2 · 9 October 2026 · Product name: Stockwise

## Problem and audience
Small retail operators must decide what to reorder, when, and how much. Historical sales alone do not explain whether stock can last through supplier lead time. This portfolio demonstrates a complete, transparent decision workflow for an inventory analyst or owner of a single store.

## Outcome
Given daily sales and current stock, compare baseline forecasts, estimate demand over lead time and review period, and produce an editable-by-assumption purchase recommendation with estimated cost. A visitor should complete the demo within five minutes without an account.

## Version 0.2 delivered requirements
1. Default Indonesian CC0 simulation: 55,000 transactions, 26 SKUs, 366 days, 25 cities, four channels, IDR, explicit synthetic provenance. Selectable comparison: twelve actual UCI Online Retail daily sales histories, 183 days each, source attribution and explicit stock/cost/lead-time assumptions.
2. Validated daily CSV imports, safe exports, selectable currency for imported datasets (no FX conversion).
3. Overview, five-baseline multi-horizon forecast comparison, scenario planning, editable inventory assumptions and replenishment plan.
4. Guest browser workspace plus optional single-operator login and private server workspace. Explicit saves, atomic persistence, stale revision rejection and prior snapshot.
5. Responsive blue/slate design, original SVG identity, loading/error/empty states and keyboard-accessible controls.
6. Container and CI definitions, production configuration gates, HTTPS/security headers and deployment/recovery instructions.

## Acceptance criteria
Scenario changes update quantities, costs, chart and explanations consistently. Reorder quantities are nonnegative integers. Zero demand never divides by zero or results in infinity in the UI. Forecast/model errors come from actual calculations, not hardcoded metrics. Reload restores validated data and controls. Malformed imports leave existing data intact. CSV export protects spreadsheet formula injection. Tables are usable on small screens and all controls have labels and keyboard access.

## Modeling and operational limitations
Real sales are observed demand proxies, possibly censored by stockouts. Backtest windows overlap; accuracy on historical periods is not a future guarantee. Models are simple baselines, not promotion-aware. Buffer is a volatility heuristic. UCI stock, buying costs, categories and supplier lead times are assumed, not measured. Incoming orders, reservations, MOQ, capacity and budget constraints are excluded.

Production target is one operator/workspace/process with a persistent volume, not multi-tenant SaaS. Real host, HTTPS, backup restore, load and security-review gates remain deployment-specific. No live deployment is claimed.

## Future milestones
Constrained orders and incoming inventory; transaction-backed stock ledger; shared database and managed identity for multiple users; independent forecast evaluation and model monitoring; optional grounded AI explanations.

## Portfolio case study
Present the business question, dataset provenance, baseline comparison, assumptions, recommendation and limitations. Measure the real forecast error; do not claim stockout reductions without a controlled evaluation.
