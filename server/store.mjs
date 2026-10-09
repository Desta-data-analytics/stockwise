import { mkdir, readFile, open, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { importCSV } from '../src/csv.js';
import { validScenario } from '../src/domain.js';
export function validateWorkspace(value) {
  if (!value || typeof value.csv !== 'string' || !validScenario(value.scenario) || !['GBP','IDR','USD','EUR'].includes(value.currency) || !['real','indonesia','import'].includes(value.source)) throw new Error('Invalid workspace schema');
  const products = importCSV(value.csv);
  if (!products.some(p => p.sku === value.selected)) throw new Error('Unknown selected product');
  return { csv: value.csv, scenario: value.scenario, currency: value.currency, source: value.source, selected: value.selected };
}
export class Store {
  constructor(directory) { this.directory = directory; this.file = path.join(directory, 'workspace.json'); this.queue = Promise.resolve(); }
  async load() {
    try { const data = JSON.parse(await readFile(this.file, 'utf8')); validateWorkspace(data); if (!Number.isInteger(data.revision)) throw new Error('Invalid saved revision'); return data; }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }
  async save(value, revision) {
    const operation = this.queue.then(async () => {
      let canonical;
      try { canonical = validateWorkspace(value); } catch (e) { e.status = 400; throw e; }
      const existing = await this.load();
      if (revision !== (existing?.revision || 0)) { const e = new Error('Workspace changed in another session. Reload before saving.'); e.status = 409; throw e; }
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const result = { ...canonical, revision: revision + 1, updatedAt: new Date().toISOString() };
      const temp = this.file + '.tmp';
      const handle = await open(temp, 'w', 0o600);
      try { await handle.writeFile(JSON.stringify(result)); await handle.sync(); } finally { await handle.close(); }
      if (existing) await copyFile(this.file, path.join(this.directory, 'workspace.previous.json'));
      await rename(temp, this.file);
      const dir = await open(this.directory, 'r'); try { await dir.sync(); } finally { await dir.close(); }
      return result;
    });
    this.queue = operation.catch(() => {}); return operation;
  }
}
