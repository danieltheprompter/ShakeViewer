import { chromium } from 'playwright';
const b=await chromium.launch(); const out='/workspace/sv-web-apple-shots/';
for (const lang of ['en','es','pt','ja']) {
  const ctx=await b.newContext({viewport:{width:1280,height:860}}); await ctx.addInitScript(l=>localStorage.setItem('sv_lang',l),lang);
  const pg=await ctx.newPage(); const errs=[];
  pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/cartocdn|ERR_FAILED/.test(m.text()))errs.push(m.text().slice(0,150));});
  await pg.goto('http://localhost:8787/'); await pg.waitForTimeout(6000);
  const pt=await pg.evaluate(()=>{for(const el of document.querySelectorAll('.sv-marker-wrap')){const r=el.getBoundingClientRect();if(r.x>450&&r.x<1200&&r.y>200&&r.y<800)return {x:r.x+r.width/2,y:r.y+r.height/2};}});
  await pg.mouse.click(pt.x,pt.y); await pg.waitForTimeout(1200);
  const m=async()=>pg.evaluate(()=>{const p=document.querySelector('.sv-popup'),btn=p.querySelector('[data-bm-id]');const r=p.getBoundingClientRect(),br=btn.getBoundingClientRect();return {popup:`${r.width.toFixed(1)}x${r.height.toFixed(1)}@${r.x.toFixed(1)},${r.y.toFixed(1)}`,btn:`${br.width.toFixed(1)}x${br.height.toFixed(1)}`,txt:btn.textContent,pressed:btn.getAttribute('aria-pressed'),label:btn.getAttribute('aria-label'),pane:document.querySelector('.leaflet-map-pane').style.transform};});
  const a=await m(); if(lang==='en') await pg.screenshot({path:out+'popup-before.png'});
  await pg.locator('.sv-popup [data-bm-id]').click(); await pg.waitForTimeout(1200);
  const c=await m(); if(lang==='en') await pg.screenshot({path:out+'popup-after.png'});
  console.log(lang,JSON.stringify(a),'\n  ->',JSON.stringify(c),'\n  same size+pos:',a.popup===c.popup&&a.btn===c.btn,'same pan:',a.pane===c.pane,'errors',errs.length,errs.join('|'));
  await ctx.close();
}
await b.close();
