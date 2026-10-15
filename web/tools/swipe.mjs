import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, recordVideo: { dir: '/tmp/vid2', size: { width: 390, height: 844 } } });
const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
const errs = []; p.on('console', m => m.type() === 'error' && !/cartocdn|ERR_FAILED/.test(m.text()) && errs.push(m.text().slice(0, 150))); p.on('pageerror', e => errs.push('pageerror ' + e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
async function drag(x, y0, dy, ms, steps = 20) {
  await touch('touchStart', x, y0);
  const track = [];
  for (let i = 1; i <= steps; i++) { await sleep(ms / steps); await touch('touchMove', x, y0 + dy * i / steps);
    if (i === Math.round(steps / 2)) track.push(await p.evaluate(() => { const r = document.querySelector('.sv-sheet').getBoundingClientRect(); return Math.round(r.top); })); }
  await touch('touchEnd'); return track[0];
}
const state = () => p.evaluate(() => ({ visible: Math.round(innerHeight - document.querySelector('.sv-sheet').getBoundingClientRect().top), detail: !!document.querySelector('.sv-sheet .qd-header') }));
const settle = async () => { await sleep(700); return state(); };
const load = async () => { await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' }); await sleep(1200); };
const openDetail = async () => { // tap first row in the list
  await p.evaluate(() => document.querySelector('.sv-sheet .row')?.click()); await sleep(1100); return state(); };
const gripY = () => p.evaluate(() => { const r = document.querySelector('.sv-sheet-grip').getBoundingClientRect(); return r.y + r.height / 2; });
const R = {};
await load(); R.initial = await state();
R.openDetail = await openDetail();
let H = R.openDetail.visible, top0 = 844 - H;
// 1) slow 20% on grip → spring back
let gy = await gripY(); let midTop = await drag(195, gy, H * 0.20, 700);
R.slow20 = { ...(await settle()), midTop, expectedMidTop: Math.round(top0 + H * 0.10) };
// 2) slow 35% → close
gy = await gripY(); R.slow35 = await (async () => { await drag(195, gy, H * 0.35, 900); return settle(); })();
// 3) fast flick (60px in ~60ms) from header → close
R.reopen = await openDetail(); const hy = await p.evaluate(() => { const r = document.querySelector('.sv-sheet .qd-header').getBoundingClientRect(); return r.y + r.height / 2; });
R.flickDy = 100; await drag(300, hy, 100, 0, 3); R.flick = await settle();

// 4) content scrolled down: list at full, scroll it, drag down from content
await p.evaluate(() => document.querySelectorAll('.mobile-view-toggle button')[1]?.click()); await sleep(700);
R.listFull = await state();
await p.evaluate(() => { document.querySelector('.sv-sheet .sv-list-scroll').scrollTop = 400; }); await sleep(200);
const st0 = await p.evaluate(() => document.querySelector('.sv-sheet .sv-list-scroll').scrollTop);
await drag(195, 450, 200, 600); const after = await settle();
const st1 = await p.evaluate(() => document.querySelector('.sv-sheet .sv-list-scroll').scrollTop);
R.contentScrolled = { scrollBefore: st0, scrollAfter: st1, ...after };
// 5) content at top: detail, drag down from content body 35% → close
await p.evaluate(() => { document.querySelector('.sv-sheet .sv-list-scroll').scrollTop = 0; }); R.reopen2 = await openDetail();
const cy = await p.evaluate(() => { const r = document.querySelector('.sv-sheet .qd-hero').getBoundingClientRect(); return r.y + r.height / 2; });
const scTop = await p.evaluate(() => document.querySelector('.sv-sheet .sv-sheet-scroll').scrollTop);
await drag(250, cy, R.reopen2.visible * 0.35, 800); R.contentAtTop = { scrollTop: scTop, ...(await settle()) };
// 6) rubber band: drag grip up beyond full
await p.evaluate(() => document.querySelectorAll('.mobile-view-toggle button')[1]?.click()); await sleep(700);
gy = await gripY(); await touch('touchStart', 195, gy); for (let i = 1; i <= 10; i++) { await sleep(30); await touch('touchMove', 195, gy - i * 20); }
R.rubber = { fingerUp: 200, sheetMovedUp: Math.round((844 - (await state()).visible) * -1 + (844 - R.listFull.visible)) }; await touch('touchEnd'); R.rubberAfter = await settle();
R.errors = errs; console.log(JSON.stringify(R, null, 1));
await ctx.close(); await b.close();
