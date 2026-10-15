import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
const bad = []; p.on('response', r => { if (/arcgis/.test(r.url()) && r.status() !== 200) bad.push(r.status()); });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
for (const s of ['Light', 'Satellite']) { await p.getByRole('button', { name: s, exact: true }).first().click(); await p.waitForTimeout(2500); await p.screenshot({ path: `/workspace/shakeviewer/screens/build-desktop-${s.toLowerCase()}.png` }); }
console.log({ errs, bad }); await b.close();
