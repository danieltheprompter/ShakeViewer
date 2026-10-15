import { chromium } from 'playwright';
const url = process.argv[2];
const b = await chromium.launch(); const out = [];
for (let run = 0; run < 3; run++) {
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { let _L; Object.defineProperty(window, 'L', { configurable: true, get: () => _L, set: v => { _L = v; v.Map.addInitHook(function () { window.__map = this; }); } }); });
const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
const errs = []; p.on('pageerror', e => errs.push(e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
await p.goto(url, { waitUntil: 'networkidle' }); await sleep(1000);
// select a quake by tapping a map dot (real mobile flow)
const dot = await p.evaluate(() => { for (const c of document.querySelectorAll('.sv-marker .core')) { const r = c.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; if (x > 10 && x < 380 && y > 70 && y < 370 && document.elementFromPoint(x, y) === c) return { x, y }; } });
await p.touchscreen.tap(dot.x, dot.y); await sleep(+process.env.WAIT || 2000);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const y0 = await p.evaluate(() => { const r = document.querySelector('.sv-sheet .qd-hero').getBoundingClientRect(); return Math.round(r.y + r.height / 2); });
await p.evaluate(() => { const sheet = document.querySelector('.sv-sheet'); const F = window.__f = []; let last = performance.now();
  const m0 = window.__map.getCenter(); const z0 = window.__map.getZoom(); const p0 = window.__map.project(m0, z0);
  const loop = (t) => { const c = window.__map.getCenter(); const pc = window.__map.project(c, z0); F.push({ t, dt: t - last, top: sheet.getBoundingClientRect().top, mapDx: pc.x - p0.x, mapDy: pc.y - p0.y, zoom: window.__map.getZoom(), rel: window.__rel || 0, detail: !!document.querySelector('.sv-sheet .qd-header') }); last = t; if (F.length < 400) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: false }); } catch {} });
await touch('touchStart', 250, y0);
for (let i = 1; i <= 8; i++) { await touch('touchMove', 250, y0 + i * 22); await sleep(12); }
await p.evaluate(() => window.__rel = performance.now()); await touch('touchEnd');
await sleep(2500);
const r = await p.evaluate(() => {
  const F = window.__f, rel = window.__rel; const after = F.filter(f => f.t >= rel);
  const finalTop = after[after.length - 1].top;
  const settledIdx = after.findIndex((f, i) => after.slice(i).every(g => Math.abs(g.top - finalTop) < 0.5));
  const settleT = after[settledIdx].t;
  const anim = after.slice(0, settledIdx + 1);
  const longest = Math.max(...anim.slice(1).map(f => f.dt));
  // in the last 100ms before settling: stalls (frames >34ms or no movement while not at final) and jumps (>40px in one frame)
  const last = anim.filter(f => f.t >= settleT - 100);
  const steps = anim.slice(1).map((f, i) => Math.abs(f.top - anim[i].top));
  const lastSteps = last.slice(1).map((f, i) => Math.abs(f.top - last[i].top));
  const stalls = last.slice(1).filter((f, i) => f.dt > 34).length;
  const contentSwapAt = (() => { const i = F.findIndex(f => f.t >= rel && !f.detail); return i < 0 ? null : Math.round(F[i].t - rel); })();
  const mapSteps = F.slice(1).map((f, i) => Math.hypot(f.mapDx - F[i].mapDx, f.mapDy - F[i].mapDy));
  const lastF = F[F.length - 1];
  const sample = anim.concat(after.slice(settledIdx + 1, settledIdx + 8)).map(f => [Math.round(f.t - rel), Math.round(innerHeight - f.top), Math.round(Math.hypot(f.mapDx, f.mapDy)), f.detail ? 'D' : 'L']);
  return { mapMaxStepPx: Math.round(Math.max(...mapSteps)), mapFinalShiftPx: Math.round(Math.hypot(lastF.mapDx, lastF.mapDy)), zoomEnd: lastF.zoom, frames_tMs_visiblePx_mapShiftPx_content: sample, settleMs: Math.round(settleT - rel), longestFrameMs: Math.round(longest), framesInAnim: anim.length, maxStepPx: Math.round(Math.max(...steps)), last100: { frames: last.length, longestFrameMs: Math.round(Math.max(0, ...last.slice(1).map(f => f.dt))), maxStepPx: Math.round(Math.max(0, ...lastSteps)), stalls }, finalVisible: Math.round(innerHeight - finalTop), contentSwapAfterReleaseMs: contentSwapAt, longTasks: window.__lt };
});
r.errors = errs; out.push(r); await ctx.close();
}
console.log(JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{'));
await b.close();
