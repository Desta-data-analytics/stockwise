import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export const hashPassword = password => { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 64).toString('hex'); };
export function verifyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 256 || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash || '')) return false;
  const [salt, expected] = hash.split(':'); return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(expected, 'hex'));
}
const digest = token => createHash('sha256').update(token).digest('hex');
export class Sessions {
  constructor() { this.sessions = new Map(); this.attempts = new Map(); }
  allowed(ip) {
    const now = Date.now(); for (const [key, value] of this.attempts) if (value.until < now) this.attempts.delete(key);
    const entry = this.attempts.get(ip) || { count: 0, until: now + 900000 };
    entry.count++; this.attempts.set(ip, entry); return entry.count <= 10 && this.attempts.size < 10000;
  }
  create() {
    for (const [key, value] of this.sessions) if (value.expires < Date.now()) this.sessions.delete(key);
    if (this.sessions.size >= 1000) this.sessions.delete(this.sessions.keys().next().value);
    const token = randomBytes(32).toString('hex'), session = { csrf: randomBytes(24).toString('hex'), expires: Date.now() + 8 * 3600000 };
    this.sessions.set(digest(token), session); return { token, ...session };
  }
  token(req) { return req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('stockwise_session='))?.split('=')[1]; }
  read(req) { const token = this.token(req); const s = token && this.sessions.get(digest(token)); return s && s.expires > Date.now() ? s : null; }
  remove(req) { const t = this.token(req); if (t) this.sessions.delete(digest(t)); }
}
