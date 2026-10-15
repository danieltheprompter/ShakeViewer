import { chromium } from 'playwright';
const url = process.argv[2];
const b = await chromium.launch();
const out = [];
for (let run = 0; run < 3; run++) {
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
await p.goto(url, { waitUntil: 'networkidle' }); await sleep(1000);
await p.evaluate(() => document.querySelector('.sv-sheet .row').click()); await sleep(1500);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const y0 = await p.evaluate(() => { const r = document.querySelector('.sv-sheet .qd-hero').getBoundingClientRect(); return Math.round(r.y + r.height / 2); });
await p.evaluate((y0) => {
  const sheet = document.querySelector('.sv-sheet'); const base = sheet.getBoundingClientRect().top;
  const M = window.__m = { moves: [], frames: [], firstMove: null, firstChange: null };
  let fingerY = null;
  document.addEventListener('touchmove', e => { const t = performance.now(); fingerY = e.touches[0].clientY; M.moves.push([t, fingerY]); if (M.firstMove == null) M.firstMove = t; }, { capture: true, passive: true });
  const loop = () => { const top = sheet.getBoundingClientRect().top; const now = performance.now();
    if (fingerY != null) { if (M.firstChange == null && Math.abs(top - base) > 0.5) M.firstChange = now; M.frames.push({ err: (fingerY - y0) - (top - base) }); }
    if (!M.stop) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
}, y0);
await touch('touchStart', 250, y0);
for (let i = 1; i <= 15; i++) { await touch('touchMove', 250, y0 + i * 6); await sleep(16); }
await sleep(100);
const m = await p.evaluate(() => { const M = window.__m; M.stop = true; const errs = M.frames.map(f => Math.abs(f.err)); return { latencyMs: M.firstChange && M.firstMove ? +(M.firstChange - M.firstMove).toFixed(1) : null, movesBeforeSheetMoved: M.moves.filter(m => m[0] < (M.firstChange || 1e12)).length, frames: errs.length, meanErrPx: +(errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(1), maxErrPx: Math.round(Math.max(...errs)), finalErrPx: Math.round(errs[errs.length - 1]) }; });
await touch('touchEnd'); await ctx.close(); out.push(m);
}
console.log(JSON.stringify(out));
await b.close();
