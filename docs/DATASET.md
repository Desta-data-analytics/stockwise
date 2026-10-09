# Dataset provenance

Source: Chen, D. (2015), Online Retail, UCI Machine Learning Repository, https://doi.org/10.24432/C5BW33. License: Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/). Adaptation: transaction filtering, daily aggregation, product subset and calendar filling. Attribute Chen and UCI when redistributing this derivative.

The original dataset contains 541,909 rows dated December 2010–December 2011, from a UK online giftware retailer with wholesale activity. Bundled daily sales cover June 1–November 30, 2011. Dates are preserved, not relabeled as current.

Preparation scans 307,355 rows in this window. It excludes cancellations, returns/nonpositive quantities, nonpositive prices, missing descriptions, non-UK sales and nonproduct codes. 272,952 rows remain across the eligible UK catalog; this is NOT the transaction count for the final 12-product subset. Among products with at least 60 active days and no daily total exceeding 2,000 units, select the top 12 by total units. Retained sales are not clipped. The bundled result contains 2,196 daily product observations, not raw transactions or customer identifiers. Missing customer IDs are not needed. Exact duplicate source rows are retained because repeated invoice lines may be legitimate; this decision can overstate demand if they are source errors.

Fill calendar dates with no retained positive transactions as zero sales. This is a known source-specific preprocessing decision, not proof of zero underlying demand. Stockout censoring, returns, closures and changing assortment are limitations.

## Explicit simulated planning fields
- Stock: recent average daily sales × scenario coverage days, varying by product.
- Lead time: assigned plausible 5–14-day supplier assumptions.
- Unit purchase cost: assumed 60% of median observed positive selling price, in GBP. UCI provides selling prices, not procurement costs.
- Category: assigned “Giftware”, not a source classification.

No FX conversion is performed. Inventory investments are estimated under these constructed assumptions. Users can edit stock, cost and lead time on the forecast page.

## Reproduction
Download https://archive.ics.uci.edu/static/public/352/online+retail.zip, then run `python scripts/prepare_dataset.py /path/to/online-retail.zip` with openpyxl installed. The source archive SHA-256, rules and counts are in public/data/provenance.json. Customer IDs and raw invoices never appear in browser assets. The raw archive is not stored in this repository.

## Indonesian default dataset · 9 October 2026
Lycus Bendln, [Indonesian Retail Sales & Cost Dataset](https://www.kaggle.com/datasets/lycusbendln/indonesian-retail-sales-and-cost-dataset), version 1, CC0: Public Domain. Downloaded directly from Kaggle's public API. Its included README explicitly says simulated Indonesian retail, not real business records. Bundled source declaration: public/data/indonesia-source-readme.md.

55,000 unique positive-quantity transaction rows; 26 products, 25 cities, four channels; 2024-01-01 to 2024-12-31. Aggregate all source transactions by product_id and date, fill all 366 calendar dates, preserving 114,889 units. Browser receives 9,516 daily observations rather than 55,000 raw transactions. One central pooled planning scenario; there is no city-specific inventory allocation. Simulated production cost divided by quantity supplies median unit cost; shipping, platform and packing excluded. Stock and supplier lead times are constructed. Categories come from source. No currency conversion.

Reproduce with `python3 scripts/prepare_indonesia.py /path/to/source.zip`, using Python standard library. Metadata and checksum: public/data/indonesia-provenance.json; aggregate: public/data/indonesia.json. UCI files and their separate provenance remain unchanged. Existing browser/server workspaces remain intact; choose Data workspace → dataset → Load selected dataset to replace intentionally.
