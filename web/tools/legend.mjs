import { chromium } from 'playwright';
const b = await chromium.launch(); const S = '/workspace/shakeviewer/screens/';
for (const [n, w, h, m] of [['desktop', 1280, 800, false], ['1440', 1440, 900, false], ['mobile', 390, 844, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
  const r = await p.evaluate(() => { const g = s => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }; return { btn: g('.map-controls-bottom .map-control-btn'), legend: g('.sv-legend') }; });
  const overlap = r.btn && r.legend ? !(r.btn.bottom <= r.legend.top || r.btn.top >= r.legend.bottom || r.btn.right <= r.legend.left || r.btn.left >= r.legend.right) : 'n/a';
  console.log(n, JSON.stringify(r), 'overlap:', overlap, 'gap:', r.btn && r.legend ? r.legend.top - r.btn.bottom : '-', 'errors:', errs.length);
  await p.screenshot({ path: S + `legend-fix-${n}.png` });
  if (n === 'desktop') await p.screenshot({ path: S + 'legend-fix-crop.png', clip: { x: 980, y: 520, width: 300, height: 280 } });
  await p.close();
}
await b.close();
