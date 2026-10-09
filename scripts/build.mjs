import { mkdir, copyFile, cp } from 'node:fs/promises';
const root = new URL('../', import.meta.url), dist = new URL('../dist/', import.meta.url);
await mkdir(dist, { recursive: true });
await copyFile(new URL('index.html', root), new URL('index.html', dist));
await cp(new URL('src/', root), new URL('src/', dist), { recursive: true });
await cp(new URL('public/', root), new URL('public/', dist), { recursive: true });
console.log('Static build complete: dist/');
