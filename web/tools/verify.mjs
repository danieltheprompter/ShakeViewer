import { chromium } from 'playwright';
const [url, tag] = process.argv.slice(2);
const browser = await chromium.launch();
const out = {};
for (const [name, vp, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  let bytes = 0; const byHost = {}; const urls = {};
  cdp.on('Network.responseReceived', e => { urls[e.requestId] = e.response.url; });
  cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; const h = (urls[e.requestId]||'?').split('/')[2]; byHost[h] = (byHost[h]||0) + e.encodedDataLength; });
  const errors = [], failed = [], bad = [], tiles = [], feeds = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('requestfailed', r => failed.push(r.url().slice(0, 120) + ' ' + r.failure()?.errorText));
  page.on('response', r => { const u = r.url(); if (/cartocdn|arcgisonline/.test(u)) tiles.push(r.status()); if (/usgs\.gov|seismicportal|PB2002/.test(u)) feeds.push(r.status() + ' ' + u.slice(0, 110)); if (r.status() >= 400) bad.push(r.status() + ' ' + u.slice(0, 120)); });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  const tLoad = Date.now() - t0;
  let tMarkers = null;
  try { await page.waitForFunction(() => document.querySelectorAll('.leaflet-marker-icon, .leaflet-interactive').length > 5, null, { timeout: 30000 }); tMarkers = Date.now() - t0; } catch {}
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const state = await page.evaluate(() => ({ firebaseReady: window.firebaseReady, apps: window.firebase?.apps?.length, markers: document.querySelectorAll('.leaflet-marker-icon').length, vectors: document.querySelectorAll('path.leaflet-interactive').length, tilesLoaded: document.querySelectorAll('img.leaflet-tile-loaded').length, fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight).filter((v, i, a) => a.indexOf(v) === i) }));
  await page.screenshot({ path: `/workspace/shakeviewer/screens/${tag}-${name}.png` });
  out[name] = { tLoad, tMarkers, kb: Math.round(bytes / 1024), byHostKB: Object.fromEntries(Object.entries(byHost).map(([k, v]) => [k, Math.round(v / 1024)])), tiles: `${tiles.filter(s => s === 200).length}/${tiles.length} 200`, feeds, ...state, errors, failed, bad };
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
