"""Reproduce CC0 Indonesian simulation; no customer/order identifiers bundled."""
import csv, io, zipfile, json, hashlib, statistics, datetime, collections, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1])
with zipfile.ZipFile(archive) as z:
    rows=list(csv.DictReader(io.StringIO(z.read('retail_indonesia_55k.csv').decode('utf-8-sig'))))
    source_readme=z.read('README.md').decode()
daily=collections.defaultdict(collections.Counter); costs=collections.defaultdict(list); info={}; channels=collections.Counter(); cities=set(); orders=set()
for r in rows:
    sku=r['product_id']; date=datetime.date.fromisoformat(r['tanggal']); units=int(r['qty'])
    assert units>0 and r['order_id'] not in orders
    orders.add(r['order_id']); daily[sku][date]+=units; costs[sku].append(float(r['biaya_produksi'])/units)
    assert sku not in info or info[sku]==(r['nama_produk'],r['kategori'])
    info[sku]=(r['nama_produk'],r['kategori']); channels[r['channel_penjualan']]+=1; cities.add(r['kota'])
start=min(d for series in daily.values() for d in series); end=max(d for series in daily.values() for d in series); days=(end-start).days+1
products=[]
for i,sku in enumerate(sorted(daily)):
    sales=[{'date':(start+datetime.timedelta(days=d)).isoformat(),'units':daily[sku][start+datetime.timedelta(days=d)]} for d in range(days)]
    products.append({'sku':sku,'name':info[sku][0],'category':info[sku][1],'stock':round(statistics.mean(s['units'] for s in sales[-28:])*[3,6,18,10,25,4,14][i%7]),'unitCost':round(statistics.median(costs[sku]),2),'leadTime':[7,10,5,14,7,5,10][i%7],'sales':sales})
meta={'title':'Indonesian Retail Sales & Cost Dataset','creator':'Lycus Bendln','kind':'synthetic','license':'CC0: Public Domain','url':'https://www.kaggle.com/datasets/lycusbendln/indonesian-retail-sales-and-cost-dataset','currency':'IDR','start':start.isoformat(),'end':end.isoformat(),'products':len(products),'days':days,'raw_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'statistics':{'raw_rows':len(rows),'retained_window_rows':len(rows),'daily_observations':len(products)*days,'units':sum(int(r['qty']) for r in rows),'cities':len(cities),'channels':dict(channels)},'selection':'All product IDs and all transactions, aggregated across channels and cities to daily product units. This is a pooled inventory scenario, not separate stock for each city or store.','zero_days':'Calendar dates without source transactions are explicitly zero-filled. Missing sales do not establish missing demand.','assumptions':'Source sales and production costs are synthetic. Unit cost uses median biaya_produksi / qty, excluding shipping, packing and platform fees. On-hand stock and supplier lead times are constructed planning inputs. No real retailer outcomes or stock ledger are available.','deduplication':'Unique order IDs verified. All 55,000 positive-quantity rows retained; customer and order identifiers omitted from public aggregates.'}
(root/'public/data/indonesia.json').write_text(json.dumps({'metadata':meta,'products':products},separators=(',',':'))+'\n')
(root/'public/data/indonesia-provenance.json').write_text(json.dumps(meta,indent=2)+'\n')
(root/'public/data/indonesia-source-readme.md').write_text('\n'.join(x.rstrip() for x in source_readme.splitlines())+'\n')
print(json.dumps(meta,indent=2))
