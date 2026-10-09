"""Reproduce the public UCI subset. Raw workbook/customer identifiers are never bundled."""
import sys, zipfile, json, hashlib, statistics, datetime, collections, io
from pathlib import Path
import openpyxl
root = Path(__file__).resolve().parents[1]
archive = Path(sys.argv[1])
start, end = datetime.date(2011, 6, 1), datetime.date(2011, 11, 30)
daily = collections.defaultdict(lambda: collections.Counter())
names = collections.defaultdict(collections.Counter)
prices = collections.defaultdict(list)
stats = collections.Counter()
with zipfile.ZipFile(archive) as z:
    workbook = openpyxl.load_workbook(io.BytesIO(z.read('Online Retail.xlsx')), read_only=True, data_only=True)
    for row in workbook.active.iter_rows(min_row=2, values_only=True):
        stats['raw_rows'] += 1
        invoice, sku, name, qty, date, price, customer, country = row
        if not isinstance(date, datetime.datetime) or not start <= date.date() <= end:
            continue
        stats['window_rows'] += 1
        if str(invoice).upper().startswith('C') or not qty or qty <= 0 or not price or price <= 0 or not name or country != 'United Kingdom' or not str(sku).replace(' ', '').isalnum() or not str(sku)[0].isdigit():
            stats['excluded_window_rows'] += 1
            continue
        sku = str(sku)
        daily[sku][date.date()] += int(qty)
        names[sku][str(name).strip()] += 1
        prices[sku].append(float(price))
        stats['retained_window_rows'] += 1
    workbook.close()
eligible = [s for s in daily if len(daily[s]) >= 60 and max(daily[s].values()) <= 2000]
ranked = sorted(eligible, key=lambda s: (-sum(daily[s].values()), s))
selected = ranked[:12]
products = []
for i, sku in enumerate(selected):
    series = [{'date': (start + datetime.timedelta(days=d)).isoformat(), 'units': daily[sku][start + datetime.timedelta(days=d)]} for d in range((end-start).days+1)]
    avg = statistics.mean(s['units'] for s in series[-28:])
    products.append({'sku': sku, 'name': names[sku].most_common(1)[0][0].title(), 'category': 'Giftware', 'stock': round(avg * [3, 6, 18, 10, 25, 4, 14, 30, 7, 20, 5, 16][i]), 'unitCost': round(statistics.median(prices[sku])*0.6, 2), 'leadTime': [7, 10, 5, 14, 7, 5, 10, 7, 14, 5, 10, 7][i], 'sales': series})
metadata = {'title': 'UCI Online Retail', 'creator': 'Daqing Chen', 'year': 2015, 'url': 'https://archive.ics.uci.edu/dataset/352/online+retail', 'doi': 'https://doi.org/10.24432/C5BW33', 'license': 'CC BY 4.0', 'currency': 'GBP', 'start': start.isoformat(), 'end': end.isoformat(), 'products': len(products), 'days': len(products[0]['sales']), 'raw_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'statistics': dict(stats), 'selection': 'Top 12 units sold among UK product SKUs active on at least 60 days, with no daily total above 2,000, in the specified window. No clipping of retained daily sales.', 'zero_days': 'Calendar days without retained positive transactions are explicitly zero-filled; zero sales do not prove zero demand.', 'assumptions': 'Stock and lead times are constructed planning scenarios. Unit cost is an assumed 60% of median observed selling price, not a measured procurement cost. No exchange-rate conversion.', 'deduplication': 'Transactions are retained as recorded; no exact-row deduplication, because repeated invoice lines may be legitimate. Cancellations, returns, nonpositive prices and nonproduct codes excluded. Missing customer IDs are irrelevant and never exported.'}
(root/'public/data/retail.json').write_text(json.dumps({'metadata':metadata,'products':products},separators=(',',':'))+'\n')
(root/'public/data/provenance.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
