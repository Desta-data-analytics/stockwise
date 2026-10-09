import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Store } from '../server/store.mjs';
import { Sessions, verifyPassword } from '../server/auth.mjs';
import { importCSV, planCSV } from '../src/csv.js';
import { plan } from '../src/domain.js';
const production = process.env.NODE_ENV === 'production';
const root = fileURLToPath(new URL(process.env.SERVE_DIST ? '../dist/' : '../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const origin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`;
const hash = process.env.OPERATOR_PASSWORD_HASH;
if (production && (!/^https:\/\//.test(origin) || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash || ''))) throw new Error('Production requires an HTTPS APP_ORIGIN and valid OPERATOR_PASSWORD_HASH');
const store = new Store(process.env.DATA_DIR || fileURLToPath(new URL('../data/private/', import.meta.url)));
const sessions = new Sessions();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json':'application/json', '.csv':'text/csv' };
function json(res, status, value) { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(value)); }
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) { const e = new Error('JSON request required'); e.status=415; throw e; }
  let size=0, chunks=[];
  for await (const chunk of req) { size+=chunk.length; if(size>3*1024*1024) { const e=new Error('Payload exceeds 3 MB'); e.status=413; throw e; } chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { const e=new Error('Malformed JSON'); e.status=400; throw e; }
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; img-src 'self' data:; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if (production) res.setHeader('Strict-Transport-Security','max-age=31536000');
  try {
    const requested = decodeURIComponent(new URL(req.url, origin).pathname);
    if (requested === '/health' && req.method==='GET') return json(res,200,{status:'ok',version:'0.2.0'});
    if (requested.startsWith('/api/')) {
      res.setHeader('Cache-Control','no-store');
      if (!['GET','POST','PUT'].includes(req.method)) return json(res,405,{error:'Method not allowed'});
      if (req.method!=='GET' && req.headers.origin!==origin) return json(res,403,{error:'Untrusted request origin'});
      const session=sessions.read(req);
      if(requested==='/api/session' && req.method==='GET') return json(res,200,{authenticated:!!session,configured:!!hash,csrf:session?.csrf || null});
      if(requested==='/api/login' && req.method==='POST') {
        if(!hash) return json(res,503,{error:'Operator access is not configured on this server. Public dataset exploration remains available.'});
        if(!sessions.allowed(req.socket.remoteAddress)) return json(res,429,{error:'Too many sign-in attempts. Try again in 15 minutes.'});
        const data=await body(req);
        if(!verifyPassword(data.password,hash)) return json(res,401,{error:'Invalid credentials'});
        const created=sessions.create();
        res.setHeader('Set-Cookie',`stockwise_session=${created.token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800${production?'; Secure':''}`);
        console.log(JSON.stringify({event:'operator_login',at:new Date().toISOString()}));
        return json(res,200,{authenticated:true,csrf:created.csrf});
      }
      if(!session) return json(res,401,{error:'Sign in to access the server workspace'});
      if(req.method!=='GET' && req.headers['x-csrf-token']!==session.csrf) return json(res,403,{error:'Invalid session request token'});
      if(requested==='/api/logout' && req.method==='POST') { sessions.remove(req); res.setHeader('Set-Cookie',`stockwise_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${production?'; Secure':''}`); return json(res,200,{ok:true}); }
      if(requested==='/api/workspace' && req.method==='GET') return json(res,200,{workspace:await store.load()});
      if(requested==='/api/workspace' && req.method==='PUT') {
        const value=await body(req);
        if(!Number.isInteger(value.revision) || value.revision<0) return json(res,400,{error:'Invalid revision'});
        const saved=await store.save(value,value.revision);
        console.log(JSON.stringify({event:'workspace_saved',revision:saved.revision,at:saved.updatedAt}));
        return json(res,200,{revision:saved.revision,updatedAt:saved.updatedAt});
      }
      if(requested==='/api/plan.csv' && req.method==='GET') {
        const workspace=await store.load(); if(!workspace) return json(res,404,{error:'Save a workspace first'});
        const plans=importCSV(workspace.csv).map(p=>plan(p,workspace.scenario)).filter(p=>p.quantity);
        res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="stockwise-purchase-plan.csv"'});
        return res.end(planCSV(plans,workspace.currency));
      }
      return json(res,404,{error:'Unknown API route'});
    }
    if(!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'Method not allowed'});
    if(!(requested==='/' || requested==='/index.html' || /^\/src\/[a-z-]+\.(js|css)$/.test(requested) || /^\/public\/[a-zA-Z0-9/_-]+\.(svg|png|jpg|ico|json|csv)$/.test(requested))) return json(res,404,{error:'Not found'});
    const file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
    const resolved=await realpath(file);
    if(!resolved.startsWith(root) || !(await stat(resolved)).isFile()) return json(res,404,{error:'Not found'});
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':production?'public, max-age=300':'no-cache'});
    res.end(req.method==='HEAD'?undefined:await readFile(file));
  } catch(e) {
    if(res.headersSent) { res.end(); return; }
    const status=e.status || (e.code==='ENOENT'?404:e instanceof SyntaxError?400:500);
    if(status===500) console.error(JSON.stringify({event:'request_error',message:e.message,at:new Date().toISOString()}));
    json(res,status,{error:status===500?'Server could not complete this request':e.message});
  }
});
server.requestTimeout=15000; server.headersTimeout=10000;
server.listen(port,process.env.HOST || '127.0.0.1',()=>console.log(`Stockwise ready at ${origin} · operator access ${hash?'configured':'disabled'}`));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
