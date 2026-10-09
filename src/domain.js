export const MODELS = ['Naive', 'Moving average', 'Weekly seasonal', '28-day average', 'Exponential smoothing'];
export const defaults = { uplift: 0, leadMultiplier: 1, review: 7, buffer: 1.65, horizon: 14 };
export const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
export function forecast(series, model, horizon) {
  if (!series.length || series.some(x => !Number.isFinite(x) || x < 0)) throw new Error('Invalid demand series');
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 210 || !MODELS.includes(model)) throw new Error('Invalid forecast configuration');
  if (model === 'Weekly seasonal' && series.length < 7) throw new Error('Weekly forecasting requires 7 observations');
  const level = model === 'Exponential smoothing' ? series.reduce((s, x) => 0.3 * x + 0.7 * s, series[0]) : 0;
  return Array.from({ length: horizon }, (_, i) => {
    if (model === 'Weekly seasonal') return series[series.length - 7 + i % 7];
    if (model === 'Moving average') return mean(series.slice(-7));
    if (model === '28-day average') return mean(series.slice(-28));
    if (model === 'Exponential smoothing') return level;
    return series.at(-1);
  });
}
export function evaluate(series, horizon = 1) {
  if (series.length < 28) throw new Error('At least 28 daily observations are required');
  return MODELS.map(model => {
    const errors = []; let actual = 0, origins = 0;
    const start = Math.max(14, series.length - horizon - 27);
    for (let t = start; t + horizon <= series.length; t++) {
      const predicted = forecast(series.slice(0, t), model, horizon); origins++;
      for (let h = 0; h < horizon; h++) { errors.push(Math.abs(predicted[h] - series[t + h])); actual += series[t + h]; }
    }
    return { model, mae: mean(errors), observations: origins, horizon, wape: actual ? errors.reduce((s, x) => s + x, 0) / actual * 100 : null };
  }).sort((a, b) => a.mae - b.mae);
}
export function validScenario(s) {
  return s && Number.isFinite(s.uplift) && s.uplift >= -50 && s.uplift <= 100 &&
    Number.isFinite(s.leadMultiplier) && s.leadMultiplier >= 0.5 && s.leadMultiplier <= 3 &&
    Number.isInteger(s.review) && s.review >= 1 && s.review <= 30 &&
    Number.isFinite(s.buffer) && s.buffer >= 0 && s.buffer <= 3 && [7, 14, 28].includes(s.horizon);
}
export function plan(product, scenario = defaults) {
  if (!validScenario(scenario)) throw new Error('Invalid scenario settings');
  const series = product.sales.map(s => s.units);
  const scores = evaluate(series, Math.min(scenario.horizon, Math.floor(series.length / 3))), model = scores[0].model;
  const lead = Math.ceil(product.leadTime * scenario.leadMultiplier), days = lead + scenario.review;
  const factor = 1 + scenario.uplift / 100;
  const future = forecast(series, model, Math.max(days, scenario.horizon, 14)).map(x => x * factor);
  const recent = series.slice(-28), avg = mean(recent);
  const sd = Math.sqrt(recent.reduce((sum, x) => sum + (x - avg) ** 2, 0) / (recent.length - 1));
  const buffer = Math.ceil(scenario.buffer * sd * Math.sqrt(days) * factor);
  const target = Math.ceil(future.slice(0, days).reduce((s, x) => s + x, 0) + buffer);
  const quantity = Math.max(0, target - product.stock);
  const daily = mean(future.slice(0, days));
  const leadDemand = future.slice(0, lead).reduce((s, x) => s + x, 0);
  return { ...product, model, scores, future, lead, days, buffer, target, quantity,
    daily, coverage: daily ? product.stock / daily : null,
    cost: quantity * product.unitCost,
    demand14: future.slice(0, 14).reduce((s, x) => s + x, 0),
    status: product.stock < leadDemand ? 'Urgent' : quantity > 0 ? 'Reorder' : 'Healthy' };
}
export function demoProducts() {
  const products = [
    ['COF-001', 'House blend coffee', 'Beverages', 24, 118, 78000, 7],
    ['MAT-002', 'Ceremonial matcha', 'Beverages', 11, 190, 125000, 10],
    ['OAT-003', 'Oat milk · 1 litre', 'Dairy alternatives', 34, 130, 28000, 4],
    ['SYR-004', 'Vanilla syrup', 'Pantry', 8, 165, 65000, 7],
    ['CUP-005', 'Paper cups · pack', 'Packaging', 18, 300, 32000, 5],
    ['TEA-006', 'Earl Grey tea', 'Beverages', 6, 210, 42000, 6],
  ];
  return products.map(([sku, name, category, base, stock, unitCost, leadTime], k) => ({
    sku, name, category, stock, unitCost, leadTime,
    sales: Array.from({ length: 84 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 6, 18 + i)).toISOString().slice(0, 10),
      units: Math.max(0, Math.round(base * [0.85, 0.92, 0.95, 1, 1.18, 1.35, 1.13][i % 7] + Math.sin(i * 1.7 + k) * base * 0.08)),
    })),
  }));
}
