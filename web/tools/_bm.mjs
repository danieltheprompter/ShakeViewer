import { chromium } from 'playwright';
const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1280,height:860}})).newPage(); const errs=[];
pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/cartocdn|ERR_FAILED/.test(m.text()))errs.push(m.text().slice(0,200));});
await pg.goto('http://localhost:8787/'); await pg.waitForTimeout(6000);
const pt=await pg.evaluate(()=>{for(const el of document.querySelectorAll('.sv-marker-wrap')){const r=el.getBoundingClientRect();if(r.x>450&&r.x<1200&&r.y>120&&r.y<800)return {x:r.x+r.width/2,y:r.y+r.height/2};}});await pg.mouse.click(pt.x,pt.y); await pg.waitForTimeout(1000);
const btn=pg.locator('.sv-popup [data-bm-id]');
console.log('popup open', await pg.locator('.sv-popup').count(), 'btn', await btn.textContent());
await btn.click(); await pg.waitForTimeout(1200);
console.log('after 1: popup', await pg.locator('.sv-popup').count(), 'btn', await btn.textContent().catch(()=>'-'));
await pg.screenshot({path:'/workspace/sv-web-apple-shots/bookmark-stays-open.png'});
await btn.click(); await pg.waitForTimeout(1200);
console.log('after 2: popup', await pg.locator('.sv-popup').count(), 'btn', await btn.textContent().catch(()=>'-'));
// detail panel button
const d=pg.locator('.qd-header button[aria-label="Bookmark"], .qd-header button[aria-label="Bookmarked"]');
console.log('detail panel', await d.count());
if(await d.count()){await d.first().click();await pg.waitForTimeout(800);console.log('detail still', await pg.locator('.qd-header').count(), await d.first().getAttribute('aria-label'));}
console.log('errors',errs.length,errs.join('|')); await b.close();
