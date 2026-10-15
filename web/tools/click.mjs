import { chromium } from 'playwright';
const [url, shot] = process.argv.slice(2);
const init = () => {
  let _L; Object.defineProperty(window, 'L', { configurable: true, get: () => _L, set: v => {
    _L = v; const o = v.Marker.prototype.onAdd;
    v.Marker.prototype.onAdd = function (m) { o.call(this, m); if (this._icon) { const ll = this.getLatLng(); this._icon.dataset.ll = ll.lat.toFixed(4) + ',' + ll.lng.toFixed(4); } };
    const po = v.Popup.prototype.onAdd; v.Popup.prototype.onAdd = function (m) { po.call(this, m); const s = this._source; if (s && s.getLatLng) { const ll = s.getLatLng(); window.__popupLL = ll.lat.toFixed(4) + ',' + ll.lng.toFixed(4); } };
  } });
};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(init);
const load = async (p) => { await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {}); await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForFunction(() => document.querySelectorAll('.sv-marker .core').length > 50); await p.waitForTimeout(800); };
const p = await ctx.newPage(); await load(p);
// candidate pairs: core center of A lies inside B's icon box or B's visible core
const cand = await p.evaluate(() => {
  const els = [...document.querySelectorAll('.sv-marker-wrap')].filter(e => e.dataset.ll && e.querySelector('.core'));
  const info = els.map(e => { const c = e.querySelector('.core').getBoundingClientRect(), w = e.getBoundingClientRect(); return { ll: e.dataset.ll, cx: c.x + c.width / 2, cy: c.y + c.height / 2, r: c.width / 2, w }; })
    .filter(i => i.cx > 460 && i.cx < 1000 && i.cy > 60 && i.cy < 760); // avoid side panel / legend
  const out = [];
  for (const a of info) for (const b of info) if (a !== b && a.ll !== b.ll) {
    const inBox = a.cx >= b.w.left && a.cx <= b.w.right && a.cy >= b.w.top && a.cy <= b.w.bottom;
    if (inBox) out.push({ target: a.ll, cx: a.cx, cy: a.cy, r: a.r, other: b.ll, otherR: b.r, insideOtherCore: Math.hypot(a.cx - b.cx, a.cy - b.cy) < b.r });
  }
  const seen = new Set(); return out.filter(o => !seen.has(o.target) && seen.add(o.target)).sort((x, y) => y.otherR - x.otherR);
});
const pick = [...cand.filter(c => c.insideOtherCore).slice(0, 3), ...cand.filter(c => !c.insideOtherCore).slice(0, 7)];
const res = [];
for (const c of pick) {
  await load(p);
  // re-locate the target (positions are deterministic for the same data)
  const pos = await p.evaluate(ll => { const e = document.querySelector(`.sv-marker-wrap[data-ll="${ll}"] .core`); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, c.target);
  if (!pos) { res.push({ ...c, result: 'target missing' }); continue; }
  await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(700);
  const sel = await p.evaluate(() => window.__popupLL || null);
  res.push({ target: c.target, targetR: +c.r.toFixed(1), near: c.other, nearR: +c.otherR.toFixed(1), insideOtherCore: c.insideOtherCore, selected: sel, ok: sel === c.target });
}
if (shot) { await load(p); const c = pick[0]; const pos = await p.evaluate(ll => { const r = document.querySelector(`.sv-marker-wrap[data-ll="${ll}"] .core`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, c.target); await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(1500); await p.screenshot({ path: shot }); }
console.log(JSON.stringify(res)); console.log('pass', res.filter(r => r.ok).length, '/', res.length);
await b.close();
