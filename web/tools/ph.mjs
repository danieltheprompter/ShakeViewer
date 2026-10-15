import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch(); const p = await b.newPage();
const log = []; p.on('console', m => m.type() === 'info' && log.push(m.text()));
const st = {}; p.on('response', r => { const h = r.url().split('/')[2]; if (/carto|arcgis/.test(h)) st[h] = (st[h] || 0) + 1; });
await p.route('https://basemaps.cartocdn.com/**', r => r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync('/tmp/carto.img') }));
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
console.log(log, st); await b.close();
