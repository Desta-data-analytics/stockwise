import test from 'node:test';
import assert from 'node:assert/strict';
import { demoProducts, defaults, evaluate, forecast, plan } from '../src/domain.js';
import { csv, datasetCSV, importCSV, parseCSV, planCSV } from '../src/csv.js';

test('constant demand has zero error and an exact replenishment target', () => {
  const p = demoProducts()[0]; p.sales = p.sales.map(s => ({ ...s, units: 10 })); p.stock = 30; p.leadTime = 3;
  const result = plan(p, { ...defaults, review: 7 });
  assert.equal(result.target, 100); assert.equal(result.quantity, 70); assert.equal(result.buffer, 0);
  assert.equal(result.status, 'Reorder'); assert.equal(result.cost, 70 * p.unitCost);
  assert.ok(result.scores.every(s => s.mae === 0));
});
test('a repeating weekly series selects seasonal naive and forecasts the next weekday', () => {
  const p = demoProducts()[0]; p.sales = p.sales.map((s, i) => ({ ...s, units: [1, 2, 3, 4, 5, 6, 7][i % 7] }));
  const result = plan(p); assert.equal(result.model, 'Weekly seasonal'); assert.equal(result.scores[0].mae, 0);
  assert.deepEqual(result.future.slice(0, 7), [1, 2, 3, 4, 5, 6, 7]);
});
test('rolling evaluation never fits the held-out point', () => {
  const series = Array(28).fill(0); series[27] = 100;
  const scores = evaluate(series);
  assert.ok(scores.every(s => Math.abs(s.mae - 100 / 14) < 1e-10));
  assert.ok(scores.every(s => s.observations === 14));
});
test('zero demand is finite, high stock needs no order and zero lead time is supported', () => {
  const p = demoProducts()[0]; p.sales = p.sales.map(s => ({ ...s, units: 0 })); p.stock = 0; p.leadTime = 0;
  const r = plan(p); assert.equal(r.coverage, null); assert.equal(r.cost, 0); assert.equal(r.quantity, 0); assert.equal(r.status, 'Healthy');
  p.stock = 100000; assert.equal(plan(p).quantity, 0);
});
test('higher demand or longer lead time increases required stock for constant demand', () => {
  const p = demoProducts()[0]; p.sales = p.sales.map(s => ({ ...s, units: 10 })); p.stock = 0;
  const base = plan(p); assert.ok(plan(p, { ...defaults, uplift: 50 }).quantity > base.quantity);
  assert.ok(plan(p, { ...defaults, leadMultiplier: 2 }).quantity > base.quantity);
});
test('invalid scenario values cannot enter calculations', () => {
  for (const change of [{ uplift: NaN }, { review: 1.5 }, { leadMultiplier: 0 }, { buffer: -1 }, { horizon: 100 }]) assert.throws(() => plan(demoProducts()[0], { ...defaults, ...change }));
  assert.throws(() => forecast([1, NaN], 'Naive', 7));
});
test('all demo records survive schema validation and export/reimport', () => {
  assert.deepEqual(importCSV(datasetCSV(demoProducts())), demoProducts());
  assert.equal(parseCSV(planCSV(demoProducts().map(p => plan(p)))).length, 7);
});
test('quoted commas, escaped quotes, BOM and CRLF are supported', () => {
  assert.deepEqual(parseCSV('\uFEFFa,b\r\n"x,y","say ""yes"""\r\n'), [['a', 'b'], ['x,y', 'say "yes"']]);
  assert.throws(() => parseCSV('a\n"unclosed'));
  assert.throws(() => parseCSV('a\n"closed"trailing'));
});
test('imports reject duplicate dates, gaps and invalid calendar dates', () => {
  const p = demoProducts().slice(0, 1);
  const copy = structuredClone(p); copy[0].sales[1].date = copy[0].sales[0].date;
  assert.throws(() => importCSV(datasetCSV(copy)), /Duplicate/);
  const gap = structuredClone(p); gap[0].sales.splice(10, 1);
  assert.throws(() => importCSV(datasetCSV(gap)), /contiguous/);
  assert.throws(() => importCSV(datasetCSV(p).replace('2026-07-18', '2026-02-30')), /valid YYYY/);
});
test('imports reject invalid numbers, inconsistent metadata, short series and unmatched end dates', () => {
  const base = demoProducts();
  const bad = structuredClone(base); bad[0].sales[0].units = -1;
  assert.throws(() => importCSV(datasetCSV(bad, false)), /nonnegative/);
  const short = structuredClone(base); short[0].sales = short[0].sales.slice(0, 20);
  assert.throws(() => importCSV(datasetCSV(short)), /28 daily/);
  const ends = structuredClone(base); ends[0].sales.pop();
  assert.throws(() => importCSV(datasetCSV(ends)), /same date/);
  const rows = parseCSV(datasetCSV(base)); rows[2][5] = '999';
  assert.throws(() => importCSV(csv(rows)), /consistent/);
});
test('safe exports neutralize spreadsheet formulas while internal persistence preserves original text', () => {
  const p = demoProducts().slice(0, 1); p[0].name = '=HYPERLINK("evil")'; p[0].sku = '@SKU';
  assert.ok(parseCSV(datasetCSV(p))[1][2].startsWith("'="));
  assert.deepEqual(importCSV(datasetCSV(p, false)), p);
});
