import { defaults, plan, validScenario } from './domain.js';
import { datasetCSV, importCSV, planCSV } from './csv.js';

const staticDemo = document.querySelector('meta[name="stockwise-host"]')?.content === 'static';
const KEY = 'stockwise.workspace.v2';
let seed, indonesia;
const bundles = {};
try { const response = await fetch('/public/data/retail.json'); if (!response.ok) throw new Error(); seed = await response.json(); seed.products = importCSV(datasetCSV(seed.products, false)); const idResponse = await fetch('/public/data/indonesia.json'); if (!idResponse.ok) throw new Error(); indonesia = await idResponse.json(); indonesia.products = importCSV(datasetCSV(indonesia.products, false)); bundles.real = seed; bundles.indonesia = indonesia; }
catch { document.querySelector('#app').innerHTML = '<main class="load-error"><h1>Workspace could not load</h1><p>Check your connection and reload. No data has been changed.</p><a href="/">Reload</a></main>'; throw new Error('Public dataset unavailable'); }
const demoProducts = () => structuredClone(indonesia.products);
let session = { authenticated: false, configured: false, csrf: null }, revision = 0, dirty = false, saving = false;
try { const r = staticDemo ? null : await fetch('/api/session'); if (r?.ok) session = await r.json(); } catch {}
const state = { products: demoProducts(), scenario: { ...defaults }, source: 'indonesia', currency: 'IDR', selected: indonesia.products[0].sku, page: 'overview', query: '', status: 'All' };
const money = n => new Intl.NumberFormat(state.currency === 'IDR' ? 'id-ID' : 'en-GB', { style: 'currency', currency: state.currency, maximumFractionDigits: state.currency === 'IDR' ? 0 : 2 }).format(n);
const number = n => Math.round(n).toLocaleString('en-US');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icons = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  forecast: '<path d="M3 17l6-6 4 3 8-10M15 4h6v6M3 21h18"/>',
  plan: '<path d="M8 4H5v17h14V4h-3M9 3h6v4H9zM8 12h8M8 16h6"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 16v5h16v-5"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${icons[name] || icons.overview}</svg>`;
function notify(text, error = false) {
  const el = document.querySelector('#notice'); el.textContent = text; el.className = error ? 'show error' : 'show';
  clearTimeout(notify.timer); notify.timer = setTimeout(() => { el.className = ''; }, 6500);
}
try {
  const saved = session.authenticated ? null : JSON.parse(localStorage.getItem(KEY));
  if (saved) {
    if (saved.version !== 2 || !validScenario(saved.scenario) || typeof saved.csv !== 'string') throw new Error('Invalid saved workspace');
    state.products = importCSV(saved.csv); state.scenario = saved.scenario;
    state.source = ['import','real','indonesia'].includes(saved.source) ? saved.source : 'import'; state.currency = ['GBP','IDR','USD','EUR'].includes(saved.currency) ? saved.currency : 'GBP';
    state.selected = state.products.some(p => p.sku === saved.selected) ? saved.selected : state.products[0].sku;
  }
} catch { setTimeout(() => notify('Saved workspace could not be restored. A fresh demo is available.', true), 100); }
function snapshot() { return { csv: datasetCSV(state.products, false), scenario: state.scenario, source: state.source, currency: state.currency, selected: state.selected }; }
function save() {
  if (session.authenticated) { dirty = true; return; }
  try { localStorage.setItem(KEY, JSON.stringify({ version: 2, ...snapshot() })); }
  catch { notify('Browser storage is unavailable. Export your work before leaving.', true); }
}
async function loadServer() {
  const r = await fetch('/api/workspace'); const value = await r.json();
  if (!r.ok) throw new Error(value.error);
  if (value.workspace) {
    const w = value.workspace; state.products = importCSV(w.csv); state.scenario = w.scenario; state.source = w.source; state.currency = w.currency; state.selected = w.selected; revision = w.revision; dirty = false;
  } else { revision = 0; dirty = true; }
}
if (session.authenticated) { try { await loadServer(); } catch (error) { setTimeout(() => notify(error.message, true), 100); } }
async function saveServer() {
  if (saving) return; saving = true; const captured = snapshot(); render();
  try {
    const response = await fetch('/api/workspace', { method: 'PUT', headers: { 'Content-Type':'application/json', 'X-CSRF-Token':session.csrf }, body: JSON.stringify({ ...captured, revision }) });
    const value = await response.json(); if (!response.ok) throw new Error(value.error);
    revision = value.revision; dirty = JSON.stringify(snapshot()) !== JSON.stringify(captured); notify('Workspace saved to server. Revision ' + revision + '.');
  } catch (error) { notify(error.message + ' Your current work remains on screen; export a copy before reloading.', true); }
  finally { saving = false; render(); }
}
window.addEventListener('beforeunload', e => { if (session.authenticated && dirty) { e.preventDefault(); e.returnValue = ''; } });
function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function badge(status) { return `<span class="badge ${status.toLowerCase()}"><span class="dot"></span>${status}</span>`; }
function stats(plans) {
  const risk = plans.filter(p => p.status === 'Urgent').length;
  return `<div class="metrics">
    <article class="metric"><span>Projected demand · 14 days</span><strong>${number(plans.reduce((s, p) => s + p.demand14, 0))}<small> units</small></strong><p>Across ${plans.length} product series</p></article>
    <article class="metric"><span>Products at stockout risk</span><strong>${risk.toString().padStart(2, '0')}<small class="risk-tag">needs attention</small></strong><p>Stock below estimated lead-time demand</p></article>
    <article class="metric"><span>Current inventory value</span><strong class="currency">${money(plans.reduce((s, p) => s + p.stock * p.unitCost, 0))}</strong><p>On-hand units × unit purchase cost</p></article>
    <article class="metric"><span>Suggested restock investment</span><strong class="currency">${money(plans.reduce((s, p) => s + p.cost, 0))}</strong><p>${plans.filter(p => p.quantity).length} products in the purchase plan</p></article>
  </div>`;
}
function chart(p, large = false) {
  const history = p.sales.slice(-28).map(s => s.units), future = p.future.slice(0, state.scenario.horizon);
  const all = [...history, ...future], max = Math.max(1, ...all) * 1.18;
  const width = 760, height = large ? 280 : 235, left = 44, top = 20, bottom = height - 35;
  const x = i => left + i / (all.length - 1) * (width - left - 20);
  const y = v => bottom - v / max * (bottom - top);
  const points = (a, offset) => a.map((v, i) => `${x(i + offset).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const split = x(27);
  const historyPoints = points(history, 0);
  const forecastPoints = points([history.at(-1), ...future], 27);
  const grids = Array.from({ length: 4 }, (_, i) => { const value = max * i / 3; return `<line x1="${left}" x2="740" y1="${y(value)}" y2="${y(value)}" stroke="#e7ecf3" stroke-dasharray="3 5"/><text x="30" y="${y(value) + 4}" text-anchor="end">${Math.round(value)}</text>`; }).join('');
  const date = p.sales.at(-1).date;
  return `<div class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(p.name)}: 28 days of observed daily sales, then ${future.length} forecast days using ${p.model}. Average projected demand ${p.daily.toFixed(1)} units per day.">
    <rect x="${split}" y="${top}" width="${740 - split}" height="${bottom - top}" fill="#f5f2ff" rx="6"/>${grids}
    <polygon points="${x(0)},${bottom} ${historyPoints} ${split},${bottom}" fill="#edf3ff"/>
    <polyline points="${historyPoints}" fill="none" stroke="#2563eb" stroke-width="2.8" stroke-linejoin="round"/>
    <polyline points="${forecastPoints}" fill="none" stroke="#8b5cf6" stroke-width="2.8" stroke-dasharray="6 5"/>
    <line x1="${split}" x2="${split}" y1="${top}" y2="${bottom}" stroke="#b5bfd0" stroke-dasharray="4 4"/>
    <text x="${split + 12}" y="${top + 14}" class="forecast-label">FORECAST</text>
    <text x="${left}" y="${height - 8}">${p.sales.at(-28).date}</text><text x="${split}" y="${height - 8}" text-anchor="middle">${date}</text><text x="740" y="${height - 8}" text-anchor="end">+${future.length} days</text>
  </svg></div><div class="chart-footer"><span><i class="legend actual"></i>Observed sales</span><span><i class="legend projected"></i>Projected demand</span><span class="chart-unit">Units / day · no uncertainty interval</span></div>`;
}
function selector() {
  return `<label class="inline-label">Product<select id="product-select">${state.products.map(p => `<option value="${escape(p.sku)}" ${p.sku === state.selected ? 'selected' : ''}>${escape(p.name)}</option>`).join('')}</select></label>`;
}
function scenario() {
  const s = state.scenario;
  return `<article class="card scenario-card"><div class="section-heading"><div><span class="eyebrow">WHAT-IF ANALYSIS</span><h2>Scenario assumptions</h2></div><button class="text-button" data-action="reset-scenario">Reset assumptions ↺</button></div>
    <div class="scenario-fields">
      <label>Demand change<span class="input-unit"><input id="uplift" type="number" min="-50" max="100" step="5" value="${s.uplift}" data-scenario="uplift"/>%</span></label>
      <label>Supplier lead time<span class="input-unit"><input id="leadMultiplier" type="number" min="0.5" max="3" step="0.1" value="${s.leadMultiplier}" data-scenario="leadMultiplier"/>×</span></label>
      <label>Review period<span class="input-unit"><input id="review" type="number" min="1" max="30" step="1" value="${s.review}" data-scenario="review"/>days</span></label>
      <label>Volatility buffer<span class="input-unit"><input id="buffer" type="number" min="0" max="3" step="0.05" value="${s.buffer}" data-scenario="buffer"/>×</span></label>
    </div><p class="helper">Recommendations update when you change an assumption. The volatility buffer is a planning heuristic, not a guaranteed service level.</p></article>`;
}
function table(plans) {
  const filtered = plans.filter(p => (state.status === 'All' || p.status === state.status) && `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(state.query.toLowerCase()));
  return `<div class="table-scroll"><table><thead><tr><th>Product</th><th>Status</th><th>On hand</th><th>Coverage</th><th>Suggested order</th><th>Est. investment</th><th><span class="sr-only">Open forecast</span></th></tr></thead><tbody>${filtered.length ? filtered.map(p => `<tr><td><div class="product-cell"><span class="product-avatar">${escape(p.name.slice(0, 2).toUpperCase())}</span><span><strong>${escape(p.name)}</strong><small>${escape(p.sku)} · ${escape(p.category)}</small></span></div></td><td>${badge(p.status)}</td><td>${number(p.stock)} <small>units</small></td><td>${p.coverage === null ? 'No demand' : p.coverage.toFixed(1) + ' days'}</td><td><strong>${number(p.quantity)}</strong> <small>units</small></td><td>${money(p.cost)}</td><td><button class="icon-button" data-product="${escape(p.sku)}" aria-label="View forecast for ${escape(p.name)}">${icon('arrow')}</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty">No products match these filters.</td></tr>'}</tbody></table></div>`;
}
function overview(plans, p) {
  const urgent = plans.filter(p => p.status === 'Urgent');
  return `${stats(plans)}<div class="overview-grid"><article class="card forecast-card"><div class="section-heading"><div><span class="eyebrow">DEMAND OUTLOOK</span><h2>Demand trajectory</h2></div>${selector()}</div>${chart(p)}<div class="model-strip"><span class="model-dot"></span><strong>${p.model}</strong><span>Selected from ${p.scores.length} baselines</span><span class="model-error">${p.scores[0].horizon}d MAE ${p.scores[0].mae.toFixed(2)}</span></div></article>
  <article class="insight-card"><span class="eyebrow">YOUR NEXT MOVE</span><div class="insight-symbol">↗</div><h2>${urgent.length ? `${urgent.length} ${urgent.length === 1 ? 'product needs' : 'products need'} a closer look.` : 'Your lead-time demand is covered.'}</h2><p>${urgent.length ? 'Current stock may run out before the next delivery. Start with these products.' : 'Review the suggested purchases to cover your next planning cycle.'}</p><div class="insight-list">${(urgent.length ? urgent : plans.filter(p => p.quantity)).slice(0, 3).map(p => `<div><span>${escape(p.name)}</span><strong>${number(p.quantity)} <small>units</small></strong></div>`).join('') || '<div>No orders suggested under these assumptions.</div>'}</div><button class="light-button" data-page="plan">Review purchase plan ${icon('arrow')}</button><small>Based on the current scenario</small></article></div>
  ${scenario()}<article class="card inventory-card"><div class="section-heading"><div><span class="eyebrow">INVENTORY HEALTH</span><h2>Product inventory</h2></div><div class="table-filters"><label class="sr-only" for="search">Search products</label><input id="search" type="search" placeholder="Search products…" value="${escape(state.query)}"/><label class="sr-only" for="status-filter">Filter stock status</label><select id="status-filter">${['All', 'Urgent', 'Reorder', 'Healthy'].map(x => `<option ${state.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div><div id="product-table">${table(plans)}</div></article>`;
}
function forecastPage(p) {
  return `<div class="workspace-toolbar">${selector()}<label class="inline-label">Forecast horizon<select id="horizon">${[7, 14, 28].map(n => `<option value="${n}" ${state.scenario.horizon === n ? 'selected' : ''}>${n} days</option>`).join('')}</select></label></div><article class="card"><div class="section-heading"><div><span class="eyebrow">${escape(p.sku)} · ${escape(p.category)}</span><h2>${escape(p.name)}</h2></div>${badge(p.status)}</div>${chart(p, true)}<p class="helper">Projected average: <strong>${p.daily.toFixed(1)} units/day</strong>. Observed sales may understate demand when stock was unavailable.</p>${p.scores[0].wape !== null && p.scores[0].wape > 50 ? `<div class="forecast-caution"><strong>High historical forecast error · WAPE ${p.scores[0].wape.toFixed(1)}%</strong><p>The best baseline still has substantial error on this series. Review the demand pattern and use the purchase suggestion as a scenario, not an automatic order.</p></div>` : ""}</article>
  <div class="two-col"><article class="card"><span class="eyebrow">MODEL BENCHMARK</span><h2>Model performance</h2><p class="helper">${p.scores[0].horizon}-day rolling evaluation across ${p.scores[0].observations} historical origins. Each origin uses only earlier observations. Lowest daily MAE wins. Overlapping windows are not independent observations.</p><table class="model-table"><thead><tr><th>Baseline</th><th>MAE · units</th><th>WAPE</th><th>Origins</th></tr></thead><tbody>${p.scores.map((s, i) => `<tr><td>${s.model}${i === 0 ? '<span class="winner">Selected</span>' : ''}</td><td>${s.mae.toFixed(2)}</td><td>${s.wape === null ? "—" : s.wape.toFixed(1) + "%"}</td><td>${s.observations}</td></tr>`).join('')}</tbody></table></article><article class="card reasoning"><span class="eyebrow">WHY THIS RECOMMENDATION?</span><h2>${number(p.quantity)} units to cover the next cycle.</h2><dl><div><dt>Supplier lead time</dt><dd>${p.lead} days</dd></div><div><dt>Review period</dt><dd>${state.scenario.review} days</dd></div><div><dt>Projected demand · ${p.days} days</dt><dd>${number(p.target - p.buffer)} units</dd></div><div><dt>Additional volatility buffer</dt><dd>${p.buffer} units</dd></div><div><dt>Current stock</dt><dd>${p.stock} units</dd></div></dl><p class="formula">Suggested order = max(0, target stock − current stock)</p></article></div>${inventoryInputs(p)}${scenario()}`;
}
function purchasePage(plans) {
  const orders = plans.filter(p => p.quantity > 0).sort((a, b) => (a.status === 'Urgent' ? -1 : 1) - (b.status === 'Urgent' ? -1 : 1) || b.cost - a.cost);
  return `<div class="purchase-banner"><div><span class="eyebrow">READY FOR REVIEW</span><h2>${number(orders.reduce((s, p) => s + p.quantity, 0))} units. One clear plan.</h2><p>${orders.length} products · ${money(orders.reduce((s, p) => s + p.cost, 0))} estimated purchase cost</p></div><button class="primary" data-action="export">${icon('download')} Export purchase plan</button></div>${scenario()}<article class="card"><div class="section-heading"><div><span class="eyebrow">SUGGESTED PURCHASES</span><h2>Prioritize what matters.</h2></div><span class="helper">Inventory snapshot: ${state.products[0].sales.at(-1).date}</span></div>${orders.length ? table(orders) : '<div class="empty">No purchases needed under the current scenario. Change the assumptions to explore another plan.</div>'}</article><div class="note-panel"><strong>A plan for a conversation, not an automatic order.</strong><p>Review supplier constraints, incoming orders, available cash and actual stock before ordering. Quantities exclude MOQ, case packs and reserved stock.</p></div>`;
}
function dataPage() {
  return `${accessPanel()}<div class="two-col"><article class="card import-card"><span class="eyebrow">BRING YOUR OWN DATA</span><h2>From sales history to a stock decision.</h2><p>Upload daily sales and an inventory snapshot. Guest work stays in this browser; signed-in operator work is sent to this server only when you choose Save workspace.</p><label class="upload-zone" for="csv-file"><span class="upload-icon">↑</span><strong>Select a CSV file</strong><span>UTF-8 · up to 2 MB · 50,000 rows</span><input type="file" id="csv-file" accept=".csv,text/csv"/></label><p class="helper">An import replaces the current dataset after validation. Export the current data first if you want to keep a copy.</p><button class="secondary" data-action="template">${icon('download')} Download example CSV</button></article><article class="card"><span class="eyebrow">DATA CONTRACT</span><h2>A little structure goes a long way.</h2><ul class="requirements"><li>At least 28 consecutive daily rows for each SKU.</li><li>Include zero-sales days explicitly; no missing dates.</li><li>All products must end on the same date.</li><li>Use nonnegative whole units and lead-time days.</li><li>Keep product metadata consistent across rows.</li><li>Stock is on-hand at the final date. Costs use the selected workspace currency. Currency selection does not convert amounts.</li></ul><code class="schema">date, sku, name, category, units, stock, unit_cost, lead_time</code></article></div><article class="card"><div class="section-heading"><div><span class="eyebrow">CURRENT WORKSPACE</span><h2>${state.source === 'import' ? 'Your imported dataset.' : escape(bundles[state.source].metadata.title)}</h2></div><button class="secondary" data-action="export-data">${icon('download')} Export dataset</button></div><p class="helper">${state.source === 'import' ? 'Imported CSV. Recommendations depend on the quality of these observations.' : escape(bundles[state.source].metadata.assumptions)}</p><div class="table-scroll"><table><thead><tr><th>Product</th><th>Daily observations</th><th>Period</th><th>Stock snapshot</th><th>Cost / unit</th><th>Lead time</th></tr></thead><tbody>${state.products.map(p => `<tr><td><strong>${escape(p.name)}</strong><small class="block">${escape(p.sku)}</small></td><td>${p.sales.length}</td><td>${p.sales[0].date} → ${p.sales.at(-1).date}</td><td>${p.stock}</td><td>${money(p.unitCost)}</td><td>${p.leadTime} days</td></tr>`).join('')}</tbody></table></div></article><div class="note-panel"><strong>${session.authenticated ? "Server workspace" : "Guest workspace"}</strong><p>${session.authenticated ? "Use Save workspace to persist changes on this server. Export a copy for your own backup." : "Guest changes are saved in this browser. Export before clearing browser data. Private server storage is available only on a configured Node backend."}</p><button class="text-button" data-action="reset-demo">Restore public dataset</button></div>`;
}
function render() {
  const plans = state.products.map(p => plan(p, state.scenario));
  const p = plans.find(p => p.sku === state.selected) || plans[0];
  const pages = { overview: ['Overview', 'Inventory overview', 'Monitor demand, understand risk, and plan your next replenishment.'], forecast: ['Demand forecast', 'Demand forecast', 'Compare simple models. See the evidence behind each forecast.'], plan: ['Purchase plan', 'Replenishment plan', 'A practical starting point for your next supplier conversation.'], data: ['Data workspace', 'Data & workspace', 'Inspect the demo or bring your own daily sales history.'] };
  const [title, headline, subtitle] = pages[state.page];
  document.querySelector('#app').innerHTML = `<a class="skip-link" href="#main">Skip to content</a><aside class="sidebar"><a class="brand" href="#overview" data-page="overview"><img class="brand-symbol" src="/public/brand/mark.svg" alt=""/>Stockwise</a><span class="brand-caption">DEMAND & INVENTORY</span><div class="workspace"><span class="workspace-avatar">${state.source === 'indonesia' ? 'ID' : state.source === 'real' ? 'UK' : 'MY'}</span><div><strong>${state.source === 'import' ? 'My workspace' : 'Retail planning'}</strong><small>Inventory workspace</small></div></div><span class="nav-label">WORKSPACE</span><nav aria-label="Workspace pages">${Object.entries(pages).map(([key, [name]]) => `<button data-page="${key}" class="nav-item ${state.page === key ? 'active' : ''}" ${state.page === key ? 'aria-current="page"' : ''}>${icon(key)}${name}${key === 'plan' ? `<span class="nav-count">${plans.filter(p => p.quantity).length}</span>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="demo-note"><span class="demo-spark">✧</span><strong>Plan with confidence.</strong><p>Traceable data, transparent models, and decisions you can review.</p></div><span class="portfolio-label">STOCKWISE · PLANNING WORKSPACE</span></div></aside><div class="shell"><header class="topbar"><span class="breadcrumb">Workspace <span>/</span> <strong>${title}</strong></span><div class="topbar-right"><span class="source-badge"><span class="dot"></span>${state.source === 'indonesia' ? 'Indonesia · simulation' : state.source === 'real' ? 'UCI · real sales' : 'Imported CSV'}</span>${session.authenticated ? `<button class="primary" data-action="save-server" ${saving ? "disabled" : ""}>${saving ? "Saving…" : dirty ? "Save workspace •" : "Saved · r" + revision}</button><button class="text-button" data-action="logout">Sign out</button>` : `${staticDemo ? '<span class="source-badge">Public demo</span>' : '<button class="secondary" data-action="login">Operator sign in</button>'}`}</div></header><main id="main"><div class="page-heading"><div><span class="eyebrow">${title.toUpperCase()}</span><h1>${headline}</h1><p>${subtitle}</p></div><button class="secondary" data-page="data">${icon('data')} Manage data</button></div><div class="dataset-strip"><span><span class="live-dot"></span>${state.source === 'indonesia' ? 'Indonesian simulation' : state.source === 'real' ? 'Historical dataset' : 'Local workspace'} · ${state.products.length} products</span><span>As of ${state.products[0].sales.at(-1).date} · currency ${state.currency}</span></div>${state.source === 'indonesia' ? '<div class="provenance-banner"><span class="provenance-icon">i</span><p><strong>Indonesian retail simulation · 55,000 transactions.</strong> 26 products · 25 cities · 4 channels · full year 2024. Synthetic sales and costs; stock and lead times are planning assumptions. <a href="https://www.kaggle.com/datasets/lycusbendln/indonesian-retail-sales-and-cost-dataset" target="_blank" rel="noreferrer">CC0 dataset source ↗</a></p></div>' : state.source === 'real' ? '<div class="provenance-banner"><span class="provenance-icon">i</span><p><strong>Real sales. Explicit planning assumptions.</strong> Historical UK transactions, Jun–Nov 2011. Stock, costs and lead times are simulated. <a href="https://archive.ics.uci.edu/dataset/352/online+retail" target="_blank" rel="noreferrer">Dataset source ↗</a></p></div>' : ''}${state.page === 'overview' ? overview(plans, p) : state.page === 'forecast' ? forecastPage(p) : state.page === 'plan' ? purchasePage(plans) : dataPage()}<footer>Stockwise · Explainable planning, from demand to decision.<span>Estimates depend on data and assumptions.</span></footer></main></div>`;
  bind();
}
function bind() {
  document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => { state.page = el.dataset.page; state.query = ''; state.status = 'All'; render(); window.scrollTo(0, 0); }));
  document.querySelectorAll('[data-product]').forEach(el => el.addEventListener('click', () => { state.selected = el.dataset.product; state.page = 'forecast'; save(); render(); window.scrollTo(0, 0); }));
  document.querySelectorAll('[data-inventory]').forEach(el => el.addEventListener('change', () => { const product = state.products.find(p => p.sku === state.selected), value = Number(el.value), key = el.dataset.inventory; if (el.value === '' || !Number.isFinite(value) || value < 0 || value > (key === 'leadTime' ? 60 : 1e9) || (key !== 'unitCost' && !Number.isInteger(value))) { notify('Enter a valid nonnegative value within the indicated range.', true); el.value = product[key]; return; } product[key] = value; save(); render(); }));
  document.querySelector('#currency')?.addEventListener('change', e => { state.currency = e.target.value; save(); render(); });
  document.querySelector('#load-dataset')?.addEventListener('click', () => {
    const source = document.querySelector('#dataset-select').value;
    const bundle = bundles[source]; if (!bundle) return;
    state.products = structuredClone(bundle.products); state.source = source; state.currency = bundle.metadata.currency;
    state.selected = state.products[0].sku; state.scenario = { ...defaults }; state.query = ''; state.status = 'All'; save(); render();
    notify(state.source === 'indonesia' ? 'Loaded 55,000 Indonesian simulated transactions aggregated to 26 daily product series.' : 'Loaded real UCI UK sales.');
  });
  document.querySelector('#product-select')?.addEventListener('change', e => { state.selected = e.target.value; save(); render(); });
  document.querySelector('#horizon')?.addEventListener('change', e => { state.scenario.horizon = Number(e.target.value); save(); render(); });
  document.querySelectorAll('[data-scenario]').forEach(el => el.addEventListener('change', () => {
    const next = { ...state.scenario, [el.dataset.scenario]: Number(el.value) };
    if (el.value === '' || !validScenario(next)) { notify('Enter a valid value within the indicated range.', true); el.value = state.scenario[el.dataset.scenario]; return; }
    state.scenario = next; save(); render();
  }));
  document.querySelector('#search')?.addEventListener('input', e => { state.query = e.target.value; refreshTable(); });
  document.querySelector('#status-filter')?.addEventListener('change', e => { state.status = e.target.value; refreshTable(); });
  document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => {
    const action = el.dataset.action;
    if (action === 'login') showLogin();
    if (action === 'save-server') saveServer();
    if (action === 'logout') logout();
    if (action === 'reset-scenario') { state.scenario = { ...defaults }; save(); render(); notify('Planning assumptions reset.'); }
    if (action === 'export') { download('stockwise-purchase-plan.csv', planCSV(state.products.map(p => plan(p, state.scenario)).filter(p => p.quantity), state.currency)); notify('Purchase plan exported. No supplier order has been placed.'); }
    if (action === 'template') download('stockwise-sales-example.csv', datasetCSV(state.source === 'real' ? seed.products : indonesia.products));
    if (action === 'export-data') download('stockwise-sales-data.csv', datasetCSV(state.products));
    if (action === 'reset-demo') { state.products = demoProducts(); state.source = 'indonesia'; state.currency = 'IDR'; state.selected = state.products[0].sku; state.scenario = { ...defaults }; save(); render(); notify('Indonesian simulation restored. Stock and lead times remain planning assumptions.'); }
  }));
  document.querySelector('#csv-file')?.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('CSV must be smaller than 2 MB.');
      const products = importCSV(await file.text());
      state.products = products; state.source = 'import'; state.selected = products[0].sku; state.query = ''; state.status = 'All';
      save(); render(); notify(`Imported ${products.length} products. Your new workspace is ready.`);
    } catch (error) { notify(error.message, true); e.target.value = ''; }
  });
}
function refreshTable() {
  document.querySelector('#product-table').innerHTML = table(state.products.map(p => plan(p, state.scenario)));
  document.querySelectorAll('#product-table [data-product]').forEach(el => el.addEventListener('click', () => { state.selected = el.dataset.product; state.page = 'forecast'; save(); render(); }));
}

function accessPanel() {
  const m = bundles[state.source]?.metadata;
  return `<article class="card access-panel"><div><span class="eyebrow">WORKSPACE SETTINGS</span><h2>${session.authenticated ? 'Operator workspace' : 'Explore first. Save when ready.'}</h2><p class="helper">${session.authenticated ? 'Server revision ' + revision + '. Changes require an explicit save.' : 'Public exploration requires no account. ' + (staticDemo ? 'GitHub Pages demo stores guest work in this browser. Private server storage requires the Node backend.' : 'Operator access is ' + (session.configured ? 'configured on this server.' : 'disabled until a password hash is configured on the server.'))}</p><label class="inline-label">Public dataset<select id="dataset-select"><option value="" ${state.source === 'import' ? 'selected' : ''} disabled>Select dataset (replaces workspace)</option><option value="indonesia" ${state.source === 'indonesia' ? 'selected' : ''}>Indonesia · 55,000 simulated transactions</option><option value="real" ${state.source === 'real' ? 'selected' : ''}>UCI UK · real historical sales</option></select></label><p class="helper">Loading replaces current data and planning inputs. Export a copy first if needed.</p><button class="secondary" id="load-dataset">Load selected dataset</button></div><label class="inline-label">Currency<select id="currency" ${state.source !== 'import' ? 'disabled' : ''}>${['GBP','IDR','USD','EUR'].map(c => `<option ${state.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label></article>${m ? `<article class="card provenance-details"><span class="eyebrow">DATA PROVENANCE</span><h2>${state.source === 'indonesia' ? 'Indonesian context. Explicit simulation.' : 'Real transactions. Reproducible preparation.'}</h2><p class="helper">${escape(m.creator)} · ${escape(m.license)} · <a href="${escape(m.url)}" target="_blank" rel="noreferrer">Original source ↗</a></p><div class="provenance-grid"><div><strong>${number(m.statistics.raw_rows)}</strong><span>Raw source transaction rows</span></div><div><strong>${number(m.statistics.retained_window_rows)}</strong><span>Source rows after filtering (all products)</span></div><div><strong>${m.products} × ${m.days}</strong><span>Bundled SKUs × calendar days</span></div></div><p class="helper">${escape(m.selection)} ${escape(m.zero_days)}</p><p class="helper">${escape(m.assumptions)}</p><a class="text-button" href="/public/data/${state.source === 'indonesia' ? 'indonesia-provenance' : 'provenance'}.json" target="_blank">View preparation metadata ↗</a></article>` : ''}`;
}

function showLogin() {
  const dialog = document.querySelector('#login-dialog'); dialog.showModal();
  document.querySelector('#login-error').textContent = session.configured ? '' : 'Operator access is not configured yet. See the deployment guide to enable server storage.';
  document.querySelector('#operator-password').focus();
}
document.querySelector('#login-close').addEventListener('click', () => document.querySelector('#login-dialog').close());
document.querySelector('#login-form').addEventListener('submit', async e => {
  e.preventDefault(); const submit = document.querySelector('#login-submit'); submit.disabled = true;
  try {
    const response = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:document.querySelector('#operator-password').value}) });
    const value = await response.json(); if (!response.ok) throw new Error(value.error);
    session = { ...session, ...value }; await loadServer(); document.querySelector('#operator-password').value=''; document.querySelector('#login-dialog').close(); render(); notify('Signed in. Use Save workspace to persist changes.');
  } catch(error) { document.querySelector('#login-error').textContent=error.message; }
  finally { submit.disabled=false; }
});
async function logout() {
  if (saving) { notify("Wait until the workspace save finishes."); return; }
  if (dirty && !confirm('You have unsaved server changes. Export or save them first. Sign out and discard these changes?')) return;
  try { const response=await fetch('/api/logout',{method:'POST',headers:{'X-CSRF-Token':session.csrf}}); if (!response.ok) throw new Error('Sign out failed'); }
  catch(error) { notify(error.message,true); return; }
  session.authenticated=false; session.csrf=null; revision=0; dirty=false; state.products=demoProducts(); state.source='indonesia'; state.currency='IDR'; state.selected=state.products[0].sku; state.scenario={...defaults}; render(); notify('Signed out. Private workspace removed from this page.');
}

render();

function inventoryInputs(p) { return `<article class="card"><div class="section-heading"><div><span class="eyebrow">INVENTORY SNAPSHOT</span><h2>Adjust product assumptions</h2></div><span class="helper">As of ${p.sales.at(-1).date}</span></div><div class="scenario-fields"><label>On-hand stock<span class="input-unit"><input type="number" min="0" max="1000000000" step="1" value="${p.stock}" data-inventory="stock"/>units</span></label><label>Purchase cost<span class="input-unit"><input type="number" min="0" max="1000000000" step="0.01" value="${p.unitCost}" data-inventory="unitCost"/>${state.currency}</span></label><label>Base supplier lead time<span class="input-unit"><input type="number" min="0" max="60" step="1" value="${p.leadTime}" data-inventory="leadTime"/>days</span></label></div><p class="helper">These values are planning inputs, not a measured stock ledger from the source dataset. Updates recalculate suggested quantities immediately.</p></article>`; }
