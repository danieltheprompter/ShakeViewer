import { chromium } from 'playwright';
const out='/workspace/sv-web-apple-shots/'; const b=await chromium.launch();
for (const theme of ['light','dark']) {
  const ctx=await b.newContext({viewport:{width:1280,height:860},colorScheme:theme});
  const pg=await ctx.newPage(); const errs=[];
  pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
  await pg.goto('http://localhost:8787/',{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(6000);
  await pg.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
  await pg.getByRole('button',{name:/^Sign in$/}).first().click(); await pg.waitForTimeout(800);
  await pg.screenshot({path:`${out}signin-${theme}.png`});
  await pg.getByRole('button',{name:'Sign up'}).first().click(); await pg.waitForTimeout(400);
  await pg.screenshot({path:`${out}signup-${theme}.png`});
  const box=await pg.locator('.sv-btn.apple').boundingBox(); const gbox=await pg.locator('.sv-btn.ghost',{hasText:'Google'}).boundingBox();
  console.log(theme,'apple',JSON.stringify(box),'google',JSON.stringify(gbox),'errors',errs.length,errs.filter(e=>!/cartocdn|ERR_FAILED/.test(e)).join(' | '));
  if (theme==='dark') {
    const [pop]=await Promise.all([pg.waitForEvent('popup',{timeout:15000}), pg.locator('.sv-btn.apple').click()]);
    const urls=[pop.url().split('?')[0]]; pop.on('request',r=>{if(r.isNavigationRequest())urls.push(r.url().split('?')[0]);});
    pop.on('close',()=>console.log('popup closed; nav', urls.join(' -> ')));
    for (let k=0;k<16 && !pop.isClosed();k++){ if(/appleid/.test(pop.url())){await pop.waitForTimeout(2500);await pop.screenshot({path:`${out}apple-popup.png`}).catch(()=>{});break;} await pg.waitForTimeout(500); }
    await pg.waitForTimeout(1500);
    console.log('modal error text:', await pg.locator('.modal-body').innerText().then(t=>t.split('\n').slice(-3).join(' / ')).catch(()=>''));
    console.log('popup url', pop.url().split('?')[0], 'nav', urls.join(' -> '));
    await pg.screenshot({path:`${out}after-popup-${theme}.png`});
  }
  await ctx.close();
}
await b.close();
