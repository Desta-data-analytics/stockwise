# Stockwise — Indonesian retail demand & inventory planning

## Portfolio positioning
A working portfolio MVP that takes sales history through validation, forecast comparison, inventory scenarios and a reviewable purchase plan. Suitable for demonstrating analytics and application engineering. It has not been deployed or evaluated in a real retailer's operation. The product includes deterministic models; no deployed LLM agent is claimed.

## Data and reproducibility
Default: Lycus Bendln, Indonesian Retail Sales & Cost Dataset, CC0. The publisher's included README explicitly identifies it as simulation, not real business data. Source: https://www.kaggle.com/datasets/lycusbendln/indonesian-retail-sales-and-cost-dataset.

55,000 unique transaction rows, 26 product IDs, 25 cities, four channels, 1 January–31 December 2024. All 114,889 source units are preserved in 9,516 daily observations (26 × 366). Aggregation pools locations/channels into a hypothetical central inventory; it does not model stock independently in each city. Cost is median production cost per unit; shipping/platform/packing are excluded. Stock and lead times are constructed assumptions. Customer/order IDs are not bundled.

Download the source ZIP and run `python3 scripts/prepare_indonesia.py /path/to/archive.zip` (Python standard library only). Check public/data/indonesia-provenance.json for the archive SHA256 and transformation notes. The UCI real UK dataset remains selectable as a comparison.

## Pipeline
Transaction CSV → validate product metadata and order IDs → aggregate product/day units → fill calendar zeroes → rolling temporal comparison of five baselines → lead-time/review forecast plus volatility buffer → nonnegative order quantities and IDR budget → editable UI and safe CSV.

## Measured example
Using bundled inputs and the default 14-day horizon, evaluated across 28 rolling origins per product: median per-product selected-model WAPE 39.63%, range 24.99–55.07%. This is a median of individual WAPE values, not pooled WAPE. The 28-day average wins for 23 products and the 7-day moving average for three. Model selection uses daily MAE over these same windows; this is selection backtesting, not an independent test of the selected model. Windows overlap. Synthetic accuracy does not establish real retailer performance.

PRD001 Kaos Polos Katun Lokal: daily MAE 4.67 units, WAPE 36.64%; assumed stock 42 units, lead time 7 days, review 7 days, production cost Rp45,000/unit. The default scenario suggests 191 units costing Rp8,595,000. These are recommendations from assumptions, not purchases or measured savings.

## Validation and remaining work
19 automated tests passed, including original UCI checks, Indonesian source-unit conservation, all three forecast horizons, CSV validation, IDR storage and HTTP auth/CSRF/revision flow. Syntax checks and static build passed. See VERIFICATION.md for browser evidence.

Ready to present as a portfolio MVP with transparent data provenance and limitations. Before sharing a clickable project: publish a reviewed repository, deploy a public HTTPS demo, verify that deployment, and add the final URLs here. Production use also requires configured secrets, persistent storage, tested off-host recovery and operational/security review. No real stockout reduction, revenue uplift, multi-user SaaS, production SLA or million-row browser capacity is claimed.

## Draft portfolio post
Saya membangun Stockwise, aplikasi untuk mengubah riwayat penjualan menjadi rencana restock yang bisa ditinjau.

Demo ini menggunakan 55.000 transaksi simulasi retail Indonesia: 26 produk, 25 kota, dan empat kanal penjualan sepanjang 2024. Saya membuat pipeline agregasi harian, membandingkan lima baseline forecast dengan validasi berdasarkan waktu, lalu menghitung kebutuhan stok dan perkiraan biaya dalam rupiah.

Bagian yang saya fokuskan adalah keterlacakan keputusan: model yang dipilih, error historis, dan asumsi stok serta lead time terlihat di aplikasi. Pengguna juga bisa mengubah skenario dan mengekspor rencana pembelian.

Ini masih portfolio MVP. Data Indonesia bersifat simulasi, dan rekomendasinya belum diuji pada operasional toko nyata. Dataset UK dengan transaksi historis nyata tersedia sebagai pembanding.
