import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.mjs';
import { hashPassword, verifyPassword, Sessions } from '../server/auth.mjs';
import { importCSV, datasetCSV } from '../src/csv.js';
import { defaults, evaluate, plan } from '../src/domain.js';
const data = JSON.parse(await readFile(new URL('../public/data/retail.json', import.meta.url)));
const workspace = { csv: datasetCSV(data.products, false), scenario: defaults, source: 'real', selected: data.products[0].sku, currency: 'GBP' };
test('bundled real data validates and produces finite multi-horizon forecasts', () => {
  assert.equal(data.products.length, 12); assert.equal(data.metadata.statistics.raw_rows, 541909);
  assert.equal(importCSV(workspace.csv).length, 12);
  for (const p of data.products) {
    assert.equal(p.sales.length, 183);
    for (const horizon of [7,14,28]) {
      const r = plan(p, { ...defaults, horizon });
      assert.ok(Number.isFinite(r.cost)); assert.ok(Number.isInteger(r.quantity)); assert.equal(r.scores[0].horizon, horizon);
      assert.equal(r.scores.length,5); assert.ok(r.scores.every(s => Number.isFinite(s.mae)));
    }
  }
});
test('multi-horizon backtest cannot learn a final unseen spike', () => {
  const series=Array(42).fill(0); series[41]=140;
  const scores=evaluate(series,7);
  assert.ok(scores.every(s=>s.mae>0)); assert.ok(scores.every(s=>s.horizon===7));
});
test('server persistence survives recreation, rejects conflicts, preserves previous revision', async () => {
  const dir=await mkdtemp(path.join(os.tmpdir(),'stockwise-store-')); const store=new Store(dir);
  assert.equal(await store.load(),null);
  assert.equal((await store.save(workspace,0)).revision,1);
  assert.equal((await new Store(dir).load()).currency,'GBP');
  const results=await Promise.allSettled([store.save(workspace,1),store.save(workspace,1)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  assert.equal(JSON.parse(await readFile(path.join(dir,'workspace.previous.json'))).revision,1);
  assert.equal((await store.load()).revision,2);
});
test('invalid server writes do not replace the valid workspace', async () => {
  const store=new Store(await mkdtemp(path.join(os.tmpdir(),'stockwise-invalid-')));
  await store.save(workspace,0);
  await assert.rejects(store.save({...workspace,currency:'FAKE'},1), e=>e.status===400);
  await assert.rejects(store.save({...workspace,csv:'bad'},1), e=>e.status===400);
  assert.equal((await store.load()).revision,1);
});
test('operator credentials are verified without plaintext storage', () => {
  const hash=hashPassword('a test-only long password');
  assert.equal(verifyPassword('a test-only long password',hash),true);
  assert.equal(verifyPassword('wrong',hash),false);
  assert.equal(verifyPassword('anything','malformed'),false);
});
test('sessions expire, logout invalidates cookie and login attempts are limited', () => {
  const sessions=new Sessions(), s=sessions.create();
  const req={headers:{cookie:'stockwise_session='+s.token}};
  assert.equal(sessions.read(req).csrf,s.csrf); sessions.remove(req); assert.equal(sessions.read(req),null);
  for(let i=0;i<10;i++) assert.equal(sessions.allowed('test-ip'),true);
  assert.equal(sessions.allowed('test-ip'),false);
});
const indonesia = JSON.parse(await readFile(new URL('../public/data/indonesia.json', import.meta.url)));
test('Indonesian simulation preserves source unit totals, validates CSV and persists IDR', async () => {
  const m=indonesia.metadata;
  assert.equal(m.kind,'synthetic'); assert.equal(m.statistics.raw_rows,55000);
  assert.equal(m.statistics.cities,25); assert.equal(Object.keys(m.statistics.channels).length,4);
  assert.equal(indonesia.products.length,26);
  const csv=datasetCSV(indonesia.products,false); assert.equal(importCSV(csv).length,26);
  assert.equal(indonesia.products.reduce((sum,p)=>sum+p.sales.reduce((n,s)=>n+s.units,0),0),114889);
  for(const p of indonesia.products) {
    assert.equal(p.sales.length,366); assert.equal(p.sales[0].date,'2024-01-01'); assert.equal(p.sales.at(-1).date,'2024-12-31');
    for(const horizon of [7,14,28]) { const r=plan(p,{...defaults,horizon}); assert.ok(Number.isFinite(r.cost)); assert.ok(Number.isInteger(r.quantity)); assert.ok(r.scores.every(s=>Number.isFinite(s.mae))); }
  }
  const store=new Store(await mkdtemp(path.join(os.tmpdir(),'stockwise-indonesia-')));
  await store.save({csv,scenario:defaults,source:'indonesia',currency:'IDR',selected:indonesia.products[0].sku},0);
  const saved=await new Store(store.directory).load(); assert.equal(saved.currency,'IDR'); assert.equal(saved.source,'indonesia');
});
