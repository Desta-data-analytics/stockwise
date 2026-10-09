const columns = ['date', 'sku', 'name', 'category', 'units', 'stock', 'unit_cost', 'lead_time'];
export function parseCSV(text) {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024) throw new Error('CSV must be smaller than 2 MB.');
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error('Malformed CSV quotation.');
      quoted = true;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(field); field = ''; closed = false;
      if (c !== ',') {
        if (row.some(x => x.trim())) rows.push(row);
        row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
      }
    } else {
      if (closed) throw new Error('Unexpected characters after quoted field.');
      field += c;
    }
  }
  if (quoted) throw new Error('Unclosed CSV quotation.');
  row.push(field); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
export function importCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2 || rows.length > 50001) throw new Error('Provide 1–50,000 data rows.');
  const header = rows.shift().map(x => x.trim().toLowerCase());
  if (new Set(header).size !== header.length || columns.some(x => !header.includes(x))) throw new Error(`Required columns: ${columns.join(', ')}.`);
  const products = new Map(), dates = new Map();
  rows.forEach((row, i) => {
    const fail = message => { throw new Error(`Row ${i + 2}: ${message}`); };
    if (row.length !== header.length) fail('Column count does not match header.');
    const r = Object.fromEntries(header.map((key, j) => [key, row[j].trim()]));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isFinite(Date.parse(r.date)) || new Date(r.date).toISOString().slice(0, 10) !== r.date) fail('Use a valid YYYY-MM-DD date.');
    if (!r.sku || !r.name || !r.category || [r.sku, r.name, r.category].some(x => x.length > 120)) fail('SKU, name and category must contain 1–120 characters.');
    for (const key of ['units', 'stock', 'unit_cost', 'lead_time']) {
      if (!r[key] || !Number.isFinite(Number(r[key])) || Number(r[key]) < 0 || Number(r[key]) > 1e9) fail(`${key} must be a nonnegative number, at most 1 billion.`);
    }
    if (['units', 'stock', 'lead_time'].some(key => !Number.isInteger(Number(r[key]))) || Number(r.lead_time) > 60) fail('Units and stock must be integers; lead_time must be an integer from 0–60.');
    const metadata = { sku: r.sku, name: r.name, category: r.category, stock: Number(r.stock), unitCost: Number(r.unit_cost), leadTime: Number(r.lead_time) };
    const existing = products.get(r.sku);
    if (existing && Object.keys(metadata).some(key => existing[key] !== metadata[key])) fail('Product metadata must be consistent across rows.');
    const p = existing || { ...metadata, sales: [] };
    if (!dates.has(r.sku)) dates.set(r.sku, new Set());
    if (dates.get(r.sku).has(r.date)) fail('Duplicate SKU/date.');
    dates.get(r.sku).add(r.date);
    p.sales.push({ date: r.date, units: Number(r.units) }); products.set(r.sku, p);
  });
  const result = [...products.values()];
  let end;
  for (const p of result) {
    p.sales.sort((a, b) => a.date.localeCompare(b.date));
    if (p.sales.length < 28) throw new Error(`${p.sku}: at least 28 daily rows are required.`);
    if (p.sales.some((s, i) => i && Date.parse(s.date) - Date.parse(p.sales[i - 1].date) !== 86400000)) throw new Error(`${p.sku}: dates must be contiguous. Include zero-sales days explicitly.`);
    end ??= p.sales.at(-1).date;
    if (end !== p.sales.at(-1).date) throw new Error('All products must end on the same date.');
  }
  return result;
}
function cell(value, safe = true) {
  let s = String(value);
  if (safe && /^[\s]*[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function csv(rows, safe = true) { return rows.map(row => row.map(value => cell(value, safe)).join(',')).join('\r\n'); }
export function datasetCSV(products, safe = true) {
  return csv([columns, ...products.flatMap(p => p.sales.map(s => [s.date, p.sku, p.name, p.category, s.units, p.stock, p.unitCost, p.leadTime]))], safe);
}
export function planCSV(plans, currency = 'IDR') {
  return csv([['sku', 'name', 'priority', 'on_hand', 'lead_days', 'buffer', 'target_stock', 'suggested_units', 'currency', 'unit_cost', 'estimated_cost', 'model'],
    ...plans.map(p => [p.sku, p.name, p.status, p.stock, p.lead, p.buffer, p.target, p.quantity, currency, p.unitCost, p.cost, p.model])]);
}
