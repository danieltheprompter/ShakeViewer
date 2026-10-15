import { chromium } from 'playwright';
const S = '/workspace/shakeviewer/screens/';
const reduce = process.argv[2] === 'reduce';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: reduce ? 'reduce' : 'no-preference', ...(reduce ? {} : { recordVideo: { dir: '/tmp/vid', size: { width: 390, height: 844 } } }) });
await ctx.addInitScript(() => { let _L; Object.defineProperty(window, 'L', { configurable: true, get: () => _L, set: v => { _L = v; const o = v.Marker.prototype.onAdd; v.Marker.prototype.onAdd = function (m) { o.call(this, m); if (this._icon) { const ll = this.getLatLng(); this._icon.dataset.ll = ll.lat.toFixed(3) + ',' + ll.lng.toFixed(3); } }; } }); });
const p = await ctx.newPage();
const errs = []; p.on('console', m => m.type() === 'error' && !/cartocdn|ERR_FAILED/.test(m.text()) && errs.push(m.text().slice(0, 150))); p.on('pageerror', e => errs.push('pageerror ' + e.message));
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
await p.getByRole('button', { name: 'Map' }).first().tap(); await p.waitForTimeout(800);
// pick visible dots in the map area above the peek sheet, not overlapped
const dots = await p.evaluate(() => {
  const out = [];
  for (const e of document.querySelectorAll('.sv-marker-wrap')) { const c = e.querySelector('.core'); if (!c) continue; const r = c.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    if (x < 30 || x > 360 || y < 80 || y > 360) continue; const top = document.elementFromPoint(x, y); if (top !== c) continue; out.push({ ll: e.dataset.ll, x, y }); }
  return out;
});
const coordsShown = () => p.evaluate(() => { const t = document.querySelector('.sv-sheet')?.innerText || ''; const m = t.match(/(-?[\d.]+)°([NS])\s+(-?[\d.]+)°([EW])/); return m ? [(m[2] === 'S' ? -1 : 1) * +m[1], (m[4] === 'W' ? -1 : 1) * +m[3]] : null; });
const matches = (ll, c) => { if (!c) return false; const [a, o] = ll.split(',').map(Number); const lon = ((o + 540) % 360) - 180; return Math.abs(a - c[0]) < 0.01 && Math.abs(lon - c[1]) < 0.01; };
const sheetH = () => p.evaluate(() => Math.round(document.querySelector('.sv-sheet').getBoundingClientRect().height));
const res = { dotsFound: dots.length };
// prefer a dot that has another dot geographically close, so both stay on screen after the fly-to
const geo = d => d.ll.split(',').map(Number);
const A = dots.find(d => dots.some(o => o !== d && Math.hypot(geo(d)[0]-geo(o)[0], geo(d)[1]-geo(o)[1]) < 10)) || dots[0];
res.dots = dots.map(d => d.ll);
res.peekH = await sheetH();
await p.touchscreen.tap(A.x, A.y);
await p.waitForTimeout(110); res.midH = await sheetH(); res.midOpacity = await p.evaluate(() => getComputedStyle(document.querySelector('.sv-sheet-swap')).opacity);
if (!reduce) await p.screenshot({ path: S + 'mobile-sheet-mid.png' });
await p.waitForTimeout(1200); res.openH = await sheetH();
if (!reduce) await p.screenshot({ path: S + 'mobile-sheet-open.png' });
res.leafletPopupShown = await p.evaluate(() => !!document.querySelector('.leaflet-popup'));
res.tapA = { ll: A.ll, shown: await coordsShown() }; res.tapA.ok = matches(A.ll, res.tapA.shown);
// quake visible above the sheet?
res.selectedDotY = await p.evaluate(() => { const c = [...document.querySelectorAll('.sv-marker .core')].find(c => c.getAttribute('style').includes('scale(1.3)')); return c ? Math.round(c.getBoundingClientRect().y) : null; });
// switch: tap another visible dot above the sheet
await p.evaluate(() => document.querySelector('.sv-sheet-swap').dataset.mark = '1');
const B = await p.evaluate(sel => { const top = window.innerHeight - document.querySelector('.sv-sheet').getBoundingClientRect().height;
  for (const e of document.querySelectorAll('.sv-marker-wrap')) { const c = e.querySelector('.core'); if (!c || c.getAttribute('style').includes('scale(1.3)')) continue; const r = c.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    if (x > 8 && x < 382 && y > 60 && y < top - 8 && document.elementFromPoint(x, y) === c) return { ll: e.dataset.ll, x, y }; } return null; });
if (B) { await p.touchscreen.tap(B.x, B.y); await p.waitForTimeout(150);
  res.switchSameElement = await p.evaluate(() => document.querySelector('.sv-sheet-swap')?.dataset.mark === '1');
  await p.waitForTimeout(1200); res.tapB = { ll: B.ll, shown: await coordsShown() }; res.tapB.ok = matches(B.ll, res.tapB.shown); res.switchH = await sheetH(); }
if (!B) { // no second dot on screen: fire a click on another quake's dot element directly (synthetic)
  const ll = res.dots.find(d => d !== A.ll) || null; await p.evaluate(() => document.querySelector('.sv-sheet-swap').dataset.mark = '1');
  if (ll) { await p.evaluate(ll => document.querySelector(`.sv-marker-wrap[data-ll="${ll}"] .core`).dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 0 })), ll);
    await p.waitForTimeout(150); res.switchSameElement = await p.evaluate(() => document.querySelector('.sv-sheet-swap')?.dataset.mark === '1');
    await p.waitForTimeout(1200); res.tapB = { synthetic: true, ll, shown: await coordsShown() }; res.tapB.ok = matches(ll, res.tapB.shown); res.switchH = await sheetH(); } }
// dismiss: tap empty map area
const empty = await p.evaluate(() => { for (let y = 90; y < 300; y += 7) for (let x = 20; x < 370; x += 7) { const e = document.elementFromPoint(x, y); if (e && (e.classList.contains('leaflet-tile') || e.classList.contains('leaflet-container'))) return { x, y }; } return null; });
await p.touchscreen.tap(empty.x, empty.y); await p.waitForTimeout(800);
res.afterMapTap = { detailOpen: !!(await coordsShown()), h: await sheetH() };
// re-open and swipe down on grip
const C = dots.find(d => d !== A) || A;
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500); await p.getByRole('button', { name: 'Map' }).first().tap(); await p.waitForTimeout(800);
await p.touchscreen.tap(C.x, C.y); await p.waitForTimeout(1000);
res.beforeSwipeDetailOpen = !!(await coordsShown());
const g = await p.evaluate(() => { const r = document.querySelector('.sv-sheet-grip').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await p.mouse.move(g.x, g.y); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(g.x, g.y + i * 35); await p.mouse.up(); await p.waitForTimeout(800);
res.afterSwipe = { detailOpen: !!(await coordsShown()), h: await sheetH() };
res.errors = errs;
console.log(JSON.stringify(res, null, 1));
await ctx.close(); await b.close();
