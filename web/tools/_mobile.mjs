import { chromium, devices } from 'playwright';
const [,, base, prefix] = process.argv;
const b = await chromium.launch();
for (const [w, h, tag] of [[390, 844, '390x844'], [375, 667, '375x667']]) {
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: w, height: h }, colorScheme: 'dark' });
  if (!base.includes('shakeviewer.com')) await ctx.route(/basemaps\.cartocdn\.com/, r => r.continue({ headers: { ...r.request().headers(), referer: 'https://shakeviewer.com/' } }));
  const pg = await ctx.newPage(); const errs = [];
  pg.on('console', m => { if (/CARTO basemap unavailable/.test(m.text())) errs.push('FALLBACK: ' + m.text()); });
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/cartocdn|CORS|ERR_FAILED/i.test(m.text())) errs.push(m.text()); });
  await pg.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(6000);
  const grip = pg.locator('.sv-sheet-grip');
  // half -> full -> peek
  await grip.tap(); await pg.waitForTimeout(700); await grip.tap(); await pg.waitForTimeout(1200);
  // pan map a bit to load more tiles
  await pg.screenshot({ path: `/workspace/shakeviewer/screens/mobile-fix-${prefix}-${tag}.png` });
  const info = await pg.evaluate(() => {
    const s = document.querySelector('.sv-sheet'); const sr = s.getBoundingClientRect();
    const hdr = s.querySelector('.sv-sheet-list .sv-sheet-header').getBoundingClientRect();
    const rows = [...s.querySelectorAll('.sv-list-scroll *')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.height > 0 && r.top < window.innerHeight && cs.visibility !== 'hidden' && +cs.opacity !== 0 && getComputedStyle(e.closest('.sv-list-scroll')).visibility !== 'hidden'; });
    const tiles = [...document.querySelectorAll('.leaflet-tile-pane img')].map(i => i.src.replace(/key=[^&]+/, 'key=K'));
    const hosts = [...new Set(tiles.map(u => new URL(u).host))];
    return { sheetTop: Math.round(sr.top), headerBottom: Math.round(hdr.bottom), vh: innerHeight, visibleListElsInViewport: rows.length, tileHosts: hosts, tileSample: tiles[0] };
  });
  console.log(tag, JSON.stringify(info), 'errors', errs.length, errs.slice(0, 2));
  await ctx.close();
}
await b.close();
