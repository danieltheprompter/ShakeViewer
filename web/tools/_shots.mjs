import { chromium } from 'playwright';
const [,, base, prefix] = process.argv;
const b = await chromium.launch();
const out = '/workspace/shakeviewer/screens/';
let errors = 0;
for (const [vp, tag, dsf] of [[{width:1280,height:860},'desktop',1],[{width:390,height:844},'mobile',2]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, colorScheme: 'dark' });
  for (const p of ['', 'privacy', 'terms', 'support']) {
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
    const r = await pg.goto(base + '/' + p, { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(p ? 1500 : 7000);
    const name = p || 'main';
    await pg.screenshot({ path: `${out}${prefix}-${name}-${tag}.png` });
    console.log(name, tag, r.status(), 'errors:', errs.length, errs.slice(0,2).join(' | ').slice(0,200));
    errors += errs.length; await pg.close();
  }
}
// main page with a details panel open (desktop)
const ctx = await b.newContext({ viewport: {width:1280,height:860}, colorScheme: 'dark' });
const pg = await ctx.newPage(); await pg.goto(base + '/', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(7000);
const row = pg.locator('.quake-row, [class*="quake-item"], [class*="list-item"]').first();
if (await row.count()) { await row.click().catch(()=>{}); await pg.waitForTimeout(1500); }
await pg.screenshot({ path: `${out}${prefix}-main-detail-desktop.png` });
console.log('total errors', errors); await b.close();
