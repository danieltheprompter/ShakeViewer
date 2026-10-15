import { chromium } from 'playwright';
const K = process.env.CARTO_BASEMAPS_KEY; const mask = s => s.split(K).join('[KEY]');
const b = await chromium.launch();
for (const mode of ['localhost', 'referer']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  const log = []; const st = {};
  p.on('console', m => log.push(m.type() + ': ' + mask(m.text()).slice(0, 160)));
  p.on('pageerror', e => log.push('pageerror: ' + e.message));
  p.on('response', r => { const h = r.url().split('/')[2]; if (/carto|arcgis/.test(h)) { const k = h + ' ' + r.status(); st[k] = (st[k] || 0) + 1; } });
  if (mode === 'referer') await p.route('https://basemaps.cartocdn.com/**', async route => {
    const res = await route.fetch({ headers: { ...route.request().headers(), referer: 'https://shakeviewer.com/' } });
    await route.fulfill({ response: res });
  });
  await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  const attr = await p.evaluate(() => document.querySelector('.leaflet-control-attribution')?.innerText);
  await p.screenshot({ path: `/workspace/shakeviewer/screens/${mode === 'referer' ? 'carto-dark' : 'fallback-localhost-dark'}.png` });
  await p.getByRole('button', { name: 'Light', exact: true }).first().click(); await p.waitForTimeout(3000);
  const attr2 = await p.evaluate(() => document.querySelector('.leaflet-control-attribution')?.innerText);
  await p.screenshot({ path: `/workspace/shakeviewer/screens/${mode === 'referer' ? 'carto-light' : 'fallback-localhost-light'}.png` });
  console.log(mode, JSON.stringify({ st, attr, attr2, log: log.filter(l => !/^(log|debug)/.test(l)) }, null, 1));
  await ctx.close();
}
await b.close();
